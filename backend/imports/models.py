import uuid
from django.db import models
from django.conf import settings
from groups.models import Group

class CSVImport(models.Model):
    STATUS_CHOICES = (
        ('pending_review', 'Pending Review'),
        ('processed', 'Processed'),
        ('failed', 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='imports')
    filename = models.CharField(max_length=255)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_imports'
    )

    class Meta:
        db_table = 'csv_imports'

    def __str__(self):
        return f"{self.filename} ({self.status}) at {self.uploaded_at}"

class ImportAnomaly(models.Model):
    SEVERITY_CHOICES = (
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending Approval'),
        ('resolved', 'Resolved'),
        ('ignored', 'Ignored'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    csv_import = models.ForeignKey(CSVImport, on_delete=models.CASCADE, related_name='anomalies')
    row_number = models.IntegerField()
    raw_data = models.JSONField(help_text="Stores the parsed CSV row key-value pairs")
    anomaly_type = models.CharField(max_length=50)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    resolution_action = models.CharField(max_length=100, null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_anomalies'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'import_anomalies'
        ordering = ['row_number']

    def __str__(self):
        return f"Row {self.row_number} [{self.anomaly_type}]: {self.description[:40]}"
