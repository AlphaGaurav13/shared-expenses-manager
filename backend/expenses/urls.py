from django.urls import path
from .views import (
    ExpenseListCreateView,
    ExpenseDetailView,
    SettlementListCreateView,
    SettlementDetailView,
    GroupBalancesView
)

urlpatterns = [
    path('groups/<uuid:group_id>/expenses/', ExpenseListCreateView.as_view(), name='expense_list_create'),
    path('groups/<uuid:group_id>/expenses/<uuid:pk>/', ExpenseDetailView.as_view(), name='expense_detail'),
    path('groups/<uuid:group_id>/settlements/', SettlementListCreateView.as_view(), name='settlement_list_create'),
    path('groups/<uuid:group_id>/settlements/<uuid:pk>/', SettlementDetailView.as_view(), name='settlement_detail'),
    path('groups/<uuid:group_id>/balances/', GroupBalancesView.as_view(), name='group_balances'),
]
