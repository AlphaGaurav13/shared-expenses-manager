from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from .models import Group, GroupMembership
from .serializers import GroupSerializer, GroupMembershipSerializer

class GroupListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Group.objects.filter(memberships__user=self.request.user).distinct()

    def perform_create(self, serializer):
        group = serializer.save(created_by=self.request.user)
        from datetime import date
        GroupMembership.objects.create(
            group=group,
            user=self.request.user,
            joined_at=date.today()
        )

class GroupRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return Group.objects.filter(memberships__user=self.request.user).distinct()

class GroupMembershipListCreateView(generics.ListCreateAPIView):
    serializer_class = GroupMembershipSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        group_id = self.kwargs.get('group_id')
        return GroupMembership.objects.filter(group_id=group_id, group__memberships__user=self.request.user)

    def perform_create(self, serializer):
        group_id = self.kwargs.get('group_id')
        if not Group.objects.filter(id=group_id, memberships__user=self.request.user).exists():
            raise PermissionDenied("You are not a member of this group.")
        
        group = Group.objects.get(id=group_id)
        serializer.save(group=group)

class GroupMembershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = GroupMembershipSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return GroupMembership.objects.filter(group__memberships__user=self.request.user)
