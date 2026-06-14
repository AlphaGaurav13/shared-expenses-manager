from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from django.db import transaction
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import datetime

from groups.models import Group
from expenses.models import Expense, ExpenseSplit, Settlement
from expenses.services import calculate_splits, round_decimal
from .models import CSVImport, ImportAnomaly
from .serializers import CSVImportSerializer, ImportAnomalySerializer
from .parser import parse_csv_file, parse_split_details

User = get_user_model()

class CSVUploadView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, group_id):
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            raise NotFound("Group does not exist.")

        if not group.memberships.filter(user=request.user).exists():
            raise PermissionDenied("You are not a member of this group.")

        if 'file' not in request.FILES:
            raise ValidationError({"file": "No file was uploaded."})

        csv_file = request.FILES['file']
        filename = csv_file.name
        
        try:
            file_content = csv_file.read().decode('utf-8')
        except Exception as e:
            raise ValidationError({"file": f"Could not read CSV file: {e}"})

        parsed_rows = parse_csv_file(file_content, group)

        with transaction.atomic():
            csv_import = CSVImport.objects.create(
                group=group,
                filename=filename,
                uploaded_by=request.user,
                status='pending_review'
            )

            anomalies_to_create = []
            for row in parsed_rows:
                anomalies = row['anomalies']
                
                if anomalies:
                    severity_weight = {'error': 3, 'warning': 2, 'info': 1}
                    anomalies = sorted(anomalies, key=lambda x: severity_weight.get(x['severity'], 0), reverse=True)
                    
                    anomaly_type = anomalies[0]['type']
                    severity = anomalies[0]['severity']
                    description = "\n".join([f"- {a['description']}" for a in anomalies])
                else:
                    anomaly_type = 'clean'
                    severity = 'info'
                    description = "Row is clean. Ready to import."

                combined_payload = {
                    'raw': row['raw_data'],
                    'cleaned': row['cleaned_data']
                }

                anomalies_to_create.append(ImportAnomaly(
                    csv_import=csv_import,
                    row_number=row['row_number'],
                    raw_data=combined_payload,
                    anomaly_type=anomaly_type,
                    description=description,
                    severity=severity,
                    status='pending'
                ))

            ImportAnomaly.objects.bulk_create(anomalies_to_create)

        serializer = CSVImportSerializer(csv_import)
        anomaly_serializer = ImportAnomalySerializer(csv_import.anomalies.all(), many=True)
        
        return Response({
            'import': serializer.data,
            'anomalies': anomaly_serializer.data
        }, status=status.HTTP_201_CREATED)

class ImportAnomalyListView(generics.ListAPIView):
    serializer_class = ImportAnomalySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        import_id = self.kwargs.get('import_id')
        return ImportAnomaly.objects.filter(
            csv_import_id=import_id,
            csv_import__group__memberships__user=self.request.user
        )

class ImportResolveView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, group_id, import_id):
        try:
            group = Group.objects.get(id=group_id)
            csv_import = CSVImport.objects.get(id=import_id, group=group)
        except (Group.DoesNotExist, CSVImport.DoesNotExist):
            raise NotFound("Group or Import does not exist.")

        if not group.memberships.filter(user=request.user).exists():
            raise PermissionDenied("You are not a member of this group.")

        if csv_import.status != 'pending_review':
            raise ValidationError(f"This import has already been {csv_import.status}.")

        resolutions = request.data.get('resolutions', {})
        usd_rate_str = request.data.get('usd_exchange_rate', '83.0')
        try:
            usd_exchange_rate = Decimal(str(usd_rate_str))
        except InvalidOperation:
            raise ValidationError({"usd_exchange_rate": "Invalid exchange rate."})

        anomalies = {str(a.row_number): a for a in csv_import.anomalies.all()}
        
        with transaction.atomic():
            for row_num_str, res in resolutions.items():
                if row_num_str not in anomalies:
                    continue
                
                anomaly_rec = anomalies[row_num_str]
                action = res.get('action', 'import')
                
                if action == 'ignore':
                    anomaly_rec.status = 'ignored'
                    anomaly_rec.resolution_action = 'ignored'
                    anomaly_rec.resolved_by = request.user
                    anomaly_rec.resolved_at = datetime.now()
                    anomaly_rec.save()
                    continue
                
                edited_data = res.get('edited_data', {})
                if not edited_data:
                    edited_data = anomaly_rec.raw_data.get('cleaned', {})

                date_str = edited_data.get('date')
                description = edited_data.get('description', '').strip()
                payer_username = edited_data.get('payer_username', '').strip()
                amount_val = edited_data.get('amount', 0.0)
                currency = edited_data.get('currency', 'INR').strip()
                split_type = edited_data.get('split_type', 'equal').strip().lower()
                split_with_usernames = edited_data.get('split_with_usernames', [])
                split_details_str = edited_data.get('split_details', '')
                notes = edited_data.get('notes', '')
                is_settlement = edited_data.get('is_settlement', False)

                try:
                    payer = User.objects.get(username=payer_username)
                except User.DoesNotExist:
                    raise ValidationError(f"Row {row_num_str}: Payer username '{payer_username}' not found.")

                split_users = []
                for name in split_with_usernames:
                    try:
                        u = User.objects.get(username=name)
                        split_users.append(u)
                    except User.DoesNotExist:
                        raise ValidationError(f"Row {row_num_str}: Split member username '{name}' not found.")

                if not split_users and not is_settlement:
                    raise ValidationError(f"Row {row_num_str}: Split member list is empty.")

                amount = Decimal(str(amount_val))
                rate = Decimal('1.0')
                if currency == 'USD':
                    rate = usd_exchange_rate
                
                amount_in_inr = round_decimal(amount * rate)
                
                try:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    raise ValidationError(f"Row {row_num_str}: Date must be in YYYY-MM-DD format (got '{date_str}').")

                if is_settlement:
                    if not split_users:
                        raise ValidationError(f"Row {row_num_str}: Settlement requires a recipient in split_with.")
                    
                    recipient = split_users[0]
                    Settlement.objects.create(
                        group=group,
                        paid_by=payer,
                        paid_to=recipient,
                        amount=amount,
                        currency=currency,
                        exchange_rate=rate,
                        amount_in_inr=amount_in_inr,
                        date=date_obj,
                        notes=notes,
                        import_record=csv_import
                    )
                else:
                    expense = Expense.objects.create(
                        group=group,
                        description=description,
                        paid_by=payer,
                        amount=amount,
                        currency=currency,
                        exchange_rate=rate,
                        amount_in_inr=amount_in_inr,
                        split_type=split_type,
                        date=date_obj,
                        notes=notes,
                        import_record=csv_import
                    )

                    split_values_dict = {}
                    if split_type == 'equal':
                        calculated = calculate_splits(amount_inr=amount_in_inr, split_type='equal', members=split_users)
                        for u in split_users:
                            ExpenseSplit.objects.create(
                                expense=expense,
                                user=u,
                                split_value=None,
                                calculated_amount_inr=calculated[u.id]
                            )
                    else:
                        parsed_details = parse_split_details(split_details_str)
                        for u in split_users:
                            val = parsed_details.get(u.username, 0)
                            split_values_dict[u.id] = Decimal(str(val))
                        
                        try:
                            calculated = calculate_splits(
                                amount_inr=amount_in_inr,
                                split_type=split_type,
                                members=split_users,
                                split_values_dict=split_values_dict
                            )
                        except ValueError as e:
                            raise ValidationError(f"Row {row_num_str}: Split calculation failed: {e}")
                        
                        for u in split_users:
                            ExpenseSplit.objects.create(
                                expense=expense,
                                user=u,
                                split_value=split_values_dict[u.id],
                                calculated_amount_inr=calculated[u.id]
                            )

                anomaly_rec.status = 'resolved'
                anomaly_rec.resolution_action = 'imported'
                anomaly_rec.resolved_by = request.user
                anomaly_rec.resolved_at = datetime.now()
                anomaly_rec.save()

            csv_import.status = 'processed'
            csv_import.save()

        return Response({
            "message": "CSV Import processed and transactions committed successfully.",
            "import_id": str(import_id)
        }, status=status.HTTP_200_OK)
