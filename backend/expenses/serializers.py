from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db import transaction
from decimal import Decimal
from .models import Expense, ExpenseSplit, Settlement
from .services import calculate_splits, round_decimal
from authentication.serializers import UserSerializer

User = get_user_model()

class ExpenseSplitSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='user', write_only=True
    )

    class Meta:
        model = ExpenseSplit
        fields = ('id', 'user', 'user_id', 'split_value', 'calculated_amount_inr')
        read_only_fields = ('calculated_amount_inr',)

class ExpenseSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    paid_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='paid_by', write_only=True
    )
    splits = ExpenseSplitSerializer(many=True, required=False)

    class Meta:
        model = Expense
        fields = (
            'id', 'group', 'description', 'paid_by', 'paid_by_id',
            'amount', 'currency', 'exchange_rate', 'amount_in_inr',
            'split_type', 'date', 'notes', 'splits', 'import_record', 'created_at'
        )
        read_only_fields = ('amount_in_inr', 'group', 'import_record')

    def create(self, validated_data):
        splits_data = self.context.get('request').data.get('splits', [])
        group = self.context.get('group')
        
        amount = Decimal(str(validated_data['amount']))
        exchange_rate = Decimal(str(validated_data.get('exchange_rate', 1.0)))
        amount_in_inr = round_decimal(amount * exchange_rate)
        
        validated_data['amount_in_inr'] = amount_in_inr
        validated_data['group'] = group
        
        with transaction.atomic():
            expense = Expense.objects.create(**validated_data)
            split_type = validated_data.get('split_type', 'equal')
            
            if split_type == 'equal' and not splits_data:
                tx_date = validated_data['date']
                active_members = [
                    m.user for m in group.memberships.filter(
                        joined_at__lte=tx_date
                    ).exclude(left_at__lt=tx_date)
                ]
                if not active_members:
                    raise serializers.ValidationError("No active group members on this date.")
                
                calculated_splits = calculate_splits(amount_inr=amount_in_inr, split_type='equal', members=active_members)
                for u in active_members:
                    ExpenseSplit.objects.create(
                        expense=expense,
                        user=u,
                        split_value=None,
                        calculated_amount_inr=calculated_splits[u.id]
                    )
            else:
                split_values_dict = {}
                members = []
                for s in splits_data:
                    u_id = s.get('user_id')
                    try:
                        u = User.objects.get(id=u_id)
                        members.append(u)
                        split_values_dict[u.id] = Decimal(str(s.get('split_value', 0)))
                    except User.DoesNotExist:
                        raise serializers.ValidationError(f"User with ID {u_id} does not exist.")
                
                tx_date = validated_data['date']
                for u in members:
                    membership_exists = group.memberships.filter(
                        user=u,
                        joined_at__lte=tx_date
                    ).exclude(left_at__lt=tx_date).exists()
                    
                    if not membership_exists:
                        raise serializers.ValidationError(
                            f"User {u.username} was not an active member of the group on {tx_date}."
                        )
                
                try:
                    calculated_splits = calculate_splits(
                        amount_inr=amount_in_inr,
                        split_type=split_type,
                        members=members,
                        split_values_dict=split_values_dict
                    )
                except ValueError as e:
                    raise serializers.ValidationError(str(e))
                
                for u in members:
                    ExpenseSplit.objects.create(
                        expense=expense,
                        user=u,
                        split_value=split_values_dict.get(u.id),
                        calculated_amount_inr=calculated_splits[u.id]
                    )
                    
            return expense

class SettlementSerializer(serializers.ModelSerializer):
    paid_by = UserSerializer(read_only=True)
    paid_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='paid_by', write_only=True
    )
    paid_to = UserSerializer(read_only=True)
    paid_to_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), source='paid_to', write_only=True
    )

    class Meta:
        model = Settlement
        fields = (
            'id', 'group', 'paid_by', 'paid_by_id', 'paid_to', 'paid_to_id',
            'amount', 'currency', 'exchange_rate', 'amount_in_inr', 'date', 'notes', 'import_record', 'created_at'
        )
        read_only_fields = ('amount_in_inr', 'group', 'import_record')

    def create(self, validated_data):
        amount = Decimal(str(validated_data['amount']))
        exchange_rate = Decimal(str(validated_data.get('exchange_rate', 1.0)))
        amount_in_inr = round_decimal(amount * exchange_rate)
        
        validated_data['amount_in_inr'] = amount_in_inr
        validated_data['group'] = self.context.get('group')
        
        return Settlement.objects.create(**validated_data)
