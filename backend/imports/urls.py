from django.urls import path
from .views import CSVUploadView, ImportAnomalyListView, ImportResolveView

urlpatterns = [
    path('groups/<uuid:group_id>/imports/upload/', CSVUploadView.as_view(), name='csv_upload'),
    path('imports/<uuid:import_id>/anomalies/', ImportAnomalyListView.as_view(), name='import_anomalies'),
    path('groups/<uuid:group_id>/imports/<uuid:import_id>/resolve/', ImportResolveView.as_view(), name='import_resolve'),
]
