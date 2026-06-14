from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Group, GroupMembership
from authentication.serializers import UserSerializer

User = get_user_model()

class GroupMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), write_only=True, source='user'
    )

    class Meta:
        model = GroupMembership
        fields = ('id', 'user', 'user_id', 'joined_at', 'left_at', 'created_at')

    def validate(self, attrs):
        joined_at = attrs.get('joined_at')
        left_at = attrs.get('left_at')
        if left_at and left_at < joined_at:
            raise serializers.ValidationError({"left_at": "Leave date cannot be before join date."})
        return attrs

class GroupSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    memberships = GroupMembershipSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ('id', 'name', 'created_at', 'created_by', 'memberships')
