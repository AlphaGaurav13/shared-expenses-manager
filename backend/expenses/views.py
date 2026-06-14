from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound
from groups.models import Group
from .models import Expense, Settlement
from .serializers import ExpenseSerializer, SettlementSerializer
from .services import compute_group_balances

class GroupContextMixin:
    def get_group(self):
        group_id = self.kwargs.get('group_id')
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            raise NotFound("Group does not exist.")
            
        if not group.memberships.filter(user=self.request.user).exists():
            raise PermissionDenied("You are not a member of this group.")
            
        return group

class ExpenseListCreateView(GroupContextMixin, generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        group = self.get_group()
        return Expense.objects.filter(group=group).prefetch_related('splits__user', 'paid_by')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['group'] = self.get_group()
        return context

class ExpenseDetailView(GroupContextMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        group = self.get_group()
        return Expense.objects.filter(group=group)

class SettlementListCreateView(GroupContextMixin, generics.ListCreateAPIView):
    serializer_class = SettlementSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        group = self.get_group()
        return Settlement.objects.filter(group=group).prefetch_related('paid_by', 'paid_to')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['group'] = self.get_group()
        return context

class SettlementDetailView(GroupContextMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SettlementSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        group = self.get_group()
        return Settlement.objects.filter(group=group)

class GroupBalancesView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request, group_id):
        try:
            group = Group.objects.get(id=group_id)
        except Group.DoesNotExist:
            raise NotFound("Group does not exist.")
            
        if not group.memberships.filter(user=request.user).exists():
            raise PermissionDenied("You are not a member of this group.")
            
        data = compute_group_balances(group_id)
        return Response(data, status=status.HTTP_200_OK)
