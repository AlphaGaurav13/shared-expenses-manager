from django.urls import path
from .views import (
    GroupListCreateView,
    GroupRetrieveUpdateDestroyView,
    GroupMembershipListCreateView,
    GroupMembershipDetailView
)

urlpatterns = [
    path('', GroupListCreateView.as_view(), name='group_list_create'),
    path('<uuid:pk>/', GroupRetrieveUpdateDestroyView.as_view(), name='group_detail'),
    path('<uuid:group_id>/members/', GroupMembershipListCreateView.as_view(), name='group_membership_list_create'),
    path('memberships/<uuid:pk>/', GroupMembershipDetailView.as_view(), name='group_membership_detail'),
]
