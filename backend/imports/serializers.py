from rest_framework import serializers
from .models import CSVImport, ImportAnomaly

class CSVImportSerializer(serializers.ModelSerializer):
    anomalies_count = serializers.IntegerField(source='anomalies.count', read_only=True)

    class Meta:
        model = CSVImport
        fields = ('id', 'group', 'filename', 'status', 'uploaded_at', 'anomalies_count')
        read_only_fields = ('group',)

class ImportAnomalySerializer(serializers.ModelSerializer):
    class Meta:
        model = ImportAnomaly
        fields = ('id', 'csv_import', 'row_number', 'raw_data', 'anomaly_type', 'description', 'severity', 'status', 'resolution_action')
