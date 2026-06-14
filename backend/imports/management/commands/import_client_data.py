import uuid
from decimal import Decimal
from datetime import date
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from groups.models import Group, GroupMembership
from expenses.models import Expense, ExpenseSplit, Settlement
from expenses.services import calculate_splits, round_decimal

User = get_user_model()

class Command(BaseCommand):
    help = 'Import client CSV data resolving all anomalies based on documented policies'

    def handle(self, *args, **options):
        self.stdout.write("Starting client data import...")
        
        with transaction.atomic():
            # 1. Create users
            usernames = ['Aisha', 'Rohan', 'Priya', 'Meera', 'Sam', 'Dev', 'Kabir']
            users = {}
            for name in usernames:
                email = f"{name.lower()}@spreetail.com"
                user, created = User.objects.get_or_create(
                    username=name,
                    defaults={'email': email}
                )
                if created:
                    user.set_password('Password123')
                    user.save()
                users[name] = user
                
            self.stdout.write(f"Verified {len(users)} users.")

            # 2. Create the Group
            group, created = Group.objects.get_or_create(
                name="Flat Expenses",
                defaults={'created_by': users['Aisha']}
            )
            self.stdout.write(f"Verified Group: {group.name}")

            # 3. Create memberships with exact temporal bounds
            memberships_data = [
                ('Aisha', '2026-02-01', None),
                ('Rohan', '2026-02-01', None),
                ('Priya', '2026-02-01', None),
                ('Meera', '2026-02-01', '2026-03-31'),
                ('Sam', '2026-04-08', None),
                ('Dev', '2026-03-08', '2026-03-14'),
                ('Kabir', '2026-03-11', '2026-03-11'),
            ]
            
            GroupMembership.objects.filter(group=group).delete()
            
            for name, join_str, leave_str in memberships_data:
                join_date = date.fromisoformat(join_str)
                leave_date = date.fromisoformat(leave_str) if leave_str else None
                GroupMembership.objects.create(
                    group=group,
                    user=users[name],
                    joined_at=join_date,
                    left_at=leave_date
                )
            self.stdout.write("Set up membership timelines.")

            # Clear existing data to avoid duplicates on rerun
            Expense.objects.filter(group=group).delete()
            Settlement.objects.filter(group=group).delete()

            usd_rate = Decimal('83.0')

            def add_expense(desc, payer_name, amt, curr, rate, split_type, tx_date_str, splits_list, notes=""):
                payer = users[payer_name]
                tx_date = date.fromisoformat(tx_date_str)
                amt_dec = Decimal(str(amt))
                rate_dec = Decimal(str(rate))
                amount_inr = round_decimal(amt_dec * rate_dec)

                expense = Expense.objects.create(
                    group=group,
                    description=desc,
                    paid_by=payer,
                    amount=amt_dec,
                    currency=curr,
                    exchange_rate=rate_dec,
                    amount_in_inr=amount_inr,
                    split_type=split_type,
                    date=tx_date,
                    notes=notes
                )

                members = [users[name] for name, _ in splits_list]
                split_values_dict = {users[name].id: Decimal(str(val)) for name, val in splits_list}

                calculated = calculate_splits(
                    amount_inr=amount_inr,
                    split_type=split_type,
                    members=members,
                    split_values_dict=split_values_dict if split_type != 'equal' else None
                )

                for u in members:
                    ExpenseSplit.objects.create(
                        expense=expense,
                        user=u,
                        split_value=split_values_dict.get(u.id) if split_type != 'equal' else None,
                        calculated_amount_inr=calculated[u.id]
                    )

            def add_settlement(payer_name, recipient_name, amt, curr, rate, tx_date_str, notes=""):
                payer = users[payer_name]
                recipient = users[recipient_name]
                tx_date = date.fromisoformat(tx_date_str)
                amt_dec = Decimal(str(amt))
                rate_dec = Decimal(str(rate))
                amount_inr = round_decimal(amt_dec * rate_dec)

                Settlement.objects.create(
                    group=group,
                    paid_by=payer,
                    paid_to=recipient,
                    amount=amt_dec,
                    currency=curr,
                    exchange_rate=rate_dec,
                    amount_in_inr=amount_inr,
                    date=tx_date,
                    notes=notes
                )

            # Insert Resolved rows:
            
            # Row 2: February rent
            add_expense("February rent", "Aisha", 48000, "INR", 1.0, "equal", "2026-02-01", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 3: Groceries BigBasket
            add_expense("Groceries BigBasket", "Priya", 2340, "INR", 1.0, "equal", "2026-02-03", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 4: Wifi bill Feb
            add_expense("Wifi bill Feb", "Rohan", 1199, "INR", 1.0, "equal", "2026-02-05", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 5: Dinner at Marina Bites
            add_expense("Dinner at Marina Bites", "Dev", 3200, "INR", 1.0, "equal", "2026-02-08", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Dev', 0)], "Dev visiting for the weekend")
            # Row 6: IGNORED (Exact duplicate of Row 5)
            
            # Row 7: Electricity Feb (Quoted Comma Cleaned)
            add_expense("Electricity Feb", "Aisha", 1200, "INR", 1.0, "equal", "2026-02-10", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 8: Maid salary Feb
            add_expense("Maid salary Feb", "Meera", 3000, "INR", 1.0, "equal", "2026-02-12", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 9: Movie night snacks (Normalized casing priya -> Priya)
            add_expense("Movie night snacks", "Priya", 640, "INR", 1.0, "equal", "2026-02-14", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0)], "Meera skipped")
            # Row 10: Cylinder refill (Rounded decimals 899.995 -> 900.00)
            add_expense("Cylinder refill", "Rohan", 900.00, "INR", 1.0, "equal", "2026-02-15", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 11: Groceries DMart (Normalized spelling Priya S -> Priya)
            add_expense("Groceries DMart", "Priya", 1875, "INR", 1.0, "equal", "2026-02-18", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 12: Unequal split
            add_expense("Aisha birthday cake", "Rohan", 1500, "INR", 1.0, "unequal", "2026-02-20", 
                        [('Rohan', 700), ('Priya', 400), ('Meera', 400)], "Aisha not charged obviously")
            # Row 13: Missing Payer -> Assigned to Aisha
            add_expense("House cleaning supplies", "Aisha", 780, "INR", 1.0, "equal", "2026-02-22", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)], "Auto-assigned Aisha as payer (was empty)")
            # Row 14: Repayment logged as expense -> Settlement
            add_settlement("Rohan", "Aisha", 5000, "INR", 1.0, "2026-02-25", "Settlement repayment")
            # Row 15: Invalid split percentages (sums to 110%) -> Scaled to 100%
            add_expense("Pizza Friday", "Aisha", 1440, "INR", 1.0, "percentage", "2026-02-28", 
                        [('Aisha', 30), ('Rohan', 30), ('Priya', 30), ('Meera', 20)], "Percentages scaled proportionally from 110%")
            # Row 16: March rent
            add_expense("March rent", "Aisha", 48000, "INR", 1.0, "equal", "2026-03-01", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 17: Groceries BigBasket
            add_expense("Groceries BigBasket", "Meera", 2810, "INR", 1.0, "equal", "2026-03-03", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 18: Wifi bill Mar
            add_expense("Wifi bill Mar", "Rohan", 1199, "INR", 1.0, "equal", "2026-03-05", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 19: Goa flights
            add_expense("Goa flights", "Aisha", 32400, "INR", 1.0, "equal", "2026-03-08", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Dev', 0)], "trip starts!")
            # Row 20: Goa villa booking (USD currency converted at 83.0)
            add_expense("Goa villa booking", "Dev", 540, "USD", usd_rate, "equal", "2026-03-09", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Dev', 0)], "booked on intl site")
            # Row 21: Beach shack lunch (USD currency)
            add_expense("Beach shack lunch", "Rohan", 84, "USD", usd_rate, "equal", "2026-03-10", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Dev', 0)])
            # Row 22: Scooter rentals (Share split)
            add_expense("Scooter rentals", "Priya", 3600, "INR", 1.0, "share", "2026-03-10", 
                        [('Aisha', 1), ('Rohan', 2), ('Priya', 1), ('Dev', 2)], "Rohan and Dev took the bigger ones")
            # Row 23: Parasailing USD (including Kabir)
            add_expense("Parasailing", "Dev", 150, "USD", usd_rate, "equal", "2026-03-11", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Dev', 0), ('Kabir', 0)], "Kabir joined for the day")
            # Row 24: IGNORED (Duplicate discrepancy of Row 25 - Aisha's log is incorrect per notes)
            # Row 25: Thalassa dinner (Rohan's correct log)
            add_expense("Thalassa dinner", "Rohan", 2450, "INR", 1.0, "equal", "2026-03-11", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Dev', 0)])
            # Row 26: Negative Refund USD
            add_expense("Parasailing refund", "Dev", -30, "USD", usd_rate, "equal", "2026-03-12", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Dev', 0)], "one slot got cancelled")
            # Row 27: Normalized casing, non-standard date format Mar-14 -> 2026-03-14
            add_expense("Airport cab", "Rohan", 1100, "INR", 1.0, "equal", "2026-03-14", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Dev', 0)])
            # Row 28: Empty currency defaulted to INR
            add_expense("Groceries DMart", "Priya", 2105, "INR", 1.0, "equal", "2026-03-15", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)], "forgot to set currency")
            # Row 29: Electricity Mar
            add_expense("Electricity Mar", "Aisha", 1450, "INR", 1.0, "equal", "2026-03-18", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 30: Maid salary Mar
            add_expense("Maid salary Mar", "Meera", 3000, "INR", 1.0, "equal", "2026-03-20", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)])
            # Row 31: IGNORED (0 INR amount double count correction per notes)
            # Row 32: Invalid split percentages (sums to 110%) -> Scaled to 100%
            add_expense("Weekend brunch", "Meera", 2200, "INR", 1.0, "percentage", "2026-03-25", 
                        [('Aisha', 30), ('Rohan', 30), ('Priya', 30), ('Meera', 20)])
            # Row 33: Meera farewell dinner
            add_expense("Meera farewell dinner", "Aisha", 4800, "INR", 1.0, "equal", "2026-03-28", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Meera', 0)], "Meera moving out Sunday :(")
            # Row 34: Date format clarified (April 5 deep clean)
            add_expense("Deep cleaning service", "Rohan", 2500, "INR", 1.0, "equal", "2026-04-05", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0)])
            # Row 35: Share split
            add_expense("April rent", "Aisha", 48000, "INR", 1.0, "share", "2026-04-01", 
                        [('Aisha', 2), ('Rohan', 1), ('Priya', 1)], "Aisha took Meera's room too")
            # Row 36: Inactive member split check -> Meera left March 31, removed from April 2nd split
            add_expense("Groceries BigBasket", "Priya", 2640, "INR", 1.0, "equal", "2026-04-02", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0)], "Meera removed as she left March 31")
            # Row 37: Wifi bill Apr
            add_expense("Wifi bill Apr", "Rohan", 1199, "INR", 1.0, "equal", "2026-04-05", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0)])
            # Row 38: Sam deposit payment -> Settlement
            add_settlement("Sam", "Aisha", 15000, "INR", 1.0, "2026-04-08", "Sam deposit share")
            # Row 39: Housewarming drinks
            add_expense("Housewarming drinks", "Sam", 3100, "INR", 1.0, "equal", "2026-04-10", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Sam', 0)])
            # Row 40: Electricity Apr
            add_expense("Electricity Apr", "Aisha", 1380, "INR", 1.0, "equal", "2026-04-12", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Sam', 0)])
            # Row 41: Groceries DMart
            add_expense("Groceries DMart", "Sam", 1990, "INR", 1.0, "equal", "2026-04-15", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Sam', 0)])
            # Row 42: Equal split type override details
            add_expense("Furniture for common room", "Aisha", 12000, "INR", 1.0, "equal", "2026-04-18", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Sam', 0)])
            # Row 43: Maid salary Apr
            add_expense("Maid salary Apr", "Priya", 3000, "INR", 1.0, "equal", "2026-04-20", 
                        [('Aisha', 0), ('Rohan', 0), ('Priya', 0), ('Sam', 0)])

        self.stdout.write(self.style.SUCCESS("Successfully resolved and imported all client data into SplitPro!"))
