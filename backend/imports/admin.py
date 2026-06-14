from django.contrib import admin
from .models import CSVImport, ImportAnomaly

admin.site.register(CSVImport)
admin.site.register(ImportAnomaly)
