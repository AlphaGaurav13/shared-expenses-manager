import uuid
from django.db import models
from django.conf import settings
from groups.models import Group
from imports.models import CSVImport

class Expense(models.Model):
    SPLIT_TYPES = (
        ('equal', 'Equal'),
        ('unequal', 'Unequal'),
        ('share', 'Share'),
        ('percentage', 'Percentage'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='expenses')
    description = models.CharField(max_length=255)
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='paid_expenses'
    )
    amount = models.DecimalField(max_digits=15, decimal_places=4)
    currency = models.CharField(max_length=3, default='INR')
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, default=1.000000)
    amount_in_inr = models.DecimalField(max_digits=15, decimal_places=2)
    split_type = models.CharField(max_length=20, choices=SPLIT_TYPES, default='equal')
    date = models.DateField()
    notes = models.TextField(null=True, blank=True)
    import_record = models.ForeignKey(
        CSVImport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='expenses'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.description} ({self.amount} {self.currency}) on {self.date}"

class ExpenseSplit(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='splits')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expense_splits'
    )
    split_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    calculated_amount_inr = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        db_table = 'expense_splits'
        unique_together = ('expense', 'user')

    def __str__(self):
        return f"{self.user.username} owes {self.calculated_amount_inr} INR for {self.expense.description}"

class Settlement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='settlements')
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='payments_made'
    )
    paid_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='payments_received'
    )
    amount = models.DecimalField(max_digits=15, decimal_places=4)
    currency = models.CharField(max_length=3, default='INR')
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, default=1.000000)
    amount_in_inr = models.DecimalField(max_digits=15, decimal_places=2)
    date = models.DateField()
    notes = models.TextField(null=True, blank=True)
    import_record = models.ForeignKey(
        CSVImport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settlements'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'settlements'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.paid_by.username} paid {self.paid_to.username} {self.amount} {self.currency} on {self.date}"
