from decimal import Decimal, ROUND_HALF_UP
from django.db.models import Sum
from django.contrib.auth import get_user_model
from groups.models import Group, GroupMembership
from .models import Expense, ExpenseSplit, Settlement

User = get_user_model()

def round_decimal(val):
    return val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

def calculate_splits(amount_inr, split_type, members, split_values_dict=None):
    """
    Calculates splits for a given amount and members list.
    split_values_dict: dictionary mapping user_id -> their split value (shares, percentages, or unequal amounts).
    Returns: dict of user_id -> calculated_amount_inr (Decimal)
    """
    amount_inr = Decimal(str(amount_inr))
    n = len(members)
    if n == 0:
        return {}

    calculated = {}
    
    if split_type == 'equal':
        base = round_decimal(amount_inr / n)
        for m in members:
            m_id = m.id if hasattr(m, 'id') else m
            calculated[m_id] = base
        diff = amount_inr - sum(calculated.values())
        if diff != 0:
            first_member_id = members[0].id if hasattr(members[0], 'id') else members[0]
            calculated[first_member_id] += diff

    elif split_type == 'percentage':
        if not split_values_dict:
            raise ValueError("Split values required for percentage split.")
        
        for m in members:
            m_id = m.id if hasattr(m, 'id') else m
            pct = Decimal(str(split_values_dict.get(m_id, 0)))
            calculated[m_id] = round_decimal(amount_inr * (pct / Decimal('100.00')))
        
        diff = amount_inr - sum(calculated.values())
        if diff != 0 and len(members) > 0:
            sorted_members = sorted(members, key=lambda x: split_values_dict.get(x.id if hasattr(x, 'id') else x, 0), reverse=True)
            highest_member_id = sorted_members[0].id if hasattr(sorted_members[0], 'id') else sorted_members[0]
            calculated[highest_member_id] += diff

    elif split_type == 'share':
        if not split_values_dict:
            raise ValueError("Split values required for share split.")
        
        total_shares = sum(Decimal(str(split_values_dict.get(m.id if hasattr(m, 'id') else m, 0))) for m in members)
        if total_shares == 0:
            raise ValueError("Total shares cannot be zero.")
            
        for m in members:
            m_id = m.id if hasattr(m, 'id') else m
            shares = Decimal(str(split_values_dict.get(m_id, 0)))
            calculated[m_id] = round_decimal(amount_inr * (shares / total_shares))
        
        diff = amount_inr - sum(calculated.values())
        if diff != 0 and len(members) > 0:
            first_member_id = members[0].id if hasattr(members[0], 'id') else members[0]
            calculated[first_member_id] += diff

    elif split_type == 'unequal':
        if not split_values_dict:
            raise ValueError("Split values required for unequal split.")
        
        for m in members:
            m_id = m.id if hasattr(m, 'id') else m
            val = Decimal(str(split_values_dict.get(m_id, 0)))
            calculated[m_id] = round_decimal(val)
        
        total_calculated = sum(calculated.values())
        if total_calculated != amount_inr:
            raise ValueError(f"Sum of unequal splits ({total_calculated}) does not equal total expense amount ({amount_inr}).")
            
    return calculated

def compute_group_balances(group_id):
    """
    Computes balances, debt simplification, and detailed ledgers for a group.
    """
    group = Group.objects.prefetch_related('memberships__user').get(id=group_id)
    members = [m.user for m in group.memberships.all()]
    
    balances = {}
    ledgers = {}
    member_names = {}
    for user in members:
        balances[user.id] = Decimal('0.00')
        ledgers[user.id] = []
        member_names[user.id] = user.username
        
    expenses = Expense.objects.filter(group_id=group_id).prefetch_related('splits__user', 'paid_by')
    
    for expense in expenses:
        payer_id = expense.paid_by_id
        
        if payer_id in balances:
            balances[payer_id] += expense.amount_in_inr
            ledgers[payer_id].append({
                'type': 'expense_paid',
                'id': str(expense.id),
                'description': expense.description,
                'amount_original': expense.amount,
                'currency': expense.currency,
                'amount_inr': expense.amount_in_inr,
                'date': expense.date,
                'notes': expense.notes,
                'details': f"You paid ₹{expense.amount_in_inr:,.2f}"
            })
            
        for split in expense.splits.all():
            u_id = split.user_id
            if u_id in balances:
                balances[u_id] -= split.calculated_amount_inr
                
                split_detail_str = ""
                if expense.split_type == 'equal':
                    split_detail_str = f"Equal split among {expense.splits.count()} members"
                elif expense.split_type == 'share':
                    split_detail_str = f"Share split (your share: {split.split_value})"
                elif expense.split_type == 'percentage':
                    split_detail_str = f"Percentage split (your percentage: {split.split_value}%)"
                elif expense.split_type == 'unequal':
                    split_detail_str = f"Unequal split"
                
                ledgers[u_id].append({
                    'type': 'expense_share',
                    'id': str(expense.id),
                    'description': expense.description,
                    'amount_original': expense.amount,
                    'currency': expense.currency,
                    'amount_inr': split.calculated_amount_inr,
                    'date': expense.date,
                    'notes': expense.notes,
                    'details': f"Your share: ₹{split.calculated_amount_inr:,.2f} ({split_detail_str})"
                })

    settlements = Settlement.objects.filter(group_id=group_id).prefetch_related('paid_by', 'paid_to')
    
    for settlement in settlements:
        payer_id = settlement.paid_by_id
        recipient_id = settlement.paid_to_id
        
        if payer_id in balances:
            balances[payer_id] += settlement.amount_in_inr
            ledgers[payer_id].append({
                'type': 'settlement_paid',
                'id': str(settlement.id),
                'description': f"Paid {settlement.paid_to.username}",
                'amount_original': settlement.amount,
                'currency': settlement.currency,
                'amount_inr': settlement.amount_in_inr,
                'date': settlement.date,
                'notes': settlement.notes,
                'details': f"You paid {settlement.paid_to.username} ₹{settlement.amount_in_inr:,.2f}"
            })
            
        if recipient_id in balances:
            balances[recipient_id] -= settlement.amount_in_inr
            ledgers[recipient_id].append({
                'type': 'settlement_received',
                'id': str(settlement.id),
                'description': f"Received from {settlement.paid_by.username}",
                'amount_original': settlement.amount,
                'currency': settlement.currency,
                'amount_inr': settlement.amount_in_inr,
                'date': settlement.date,
                'notes': settlement.notes,
                'details': f"Received ₹{settlement.amount_in_inr:,.2f} from {settlement.paid_by.username}"
            })

    for u_id in ledgers:
        ledgers[u_id] = sorted(ledgers[u_id], key=lambda x: x['date'], reverse=True)

    simplified_debts = []
    temp_balances = {k: v for k, v in balances.items()}
    epsilon = Decimal('0.01')
    
    while True:
        debtors = sorted(
            [(k, v) for k, v in temp_balances.items() if v < -epsilon],
            key=lambda x: x[1]
        )
        
        creditors = sorted(
            [(k, v) for k, v in temp_balances.items() if v > epsilon],
            key=lambda x: x[1],
            reverse=True
        )
        
        if not debtors or not creditors:
            break
            
        debtor_id, debtor_bal = debtors[0]
        creditor_id, creditor_bal = creditors[0]
        
        settle_amt = min(abs(debtor_bal), creditor_bal)
        settle_amt = round_decimal(settle_amt)
        
        if settle_amt > 0:
            simplified_debts.append({
                'from_user_id': str(debtor_id),
                'from_user_name': member_names[debtor_id],
                'to_user_id': str(creditor_id),
                'to_user_name': member_names[creditor_id],
                'amount': settle_amt
            })
            
            temp_balances[debtor_id] += settle_amt
            temp_balances[creditor_id] -= settle_amt
            
    formatted_balances = []
    for u_id, bal in balances.items():
        formatted_balances.append({
            'user_id': str(u_id),
            'username': member_names[u_id],
            'net_balance': round_decimal(bal)
        })
        
    return {
        'net_balances': formatted_balances,
        'simplified_debts': simplified_debts,
        'ledgers': ledgers
    }
