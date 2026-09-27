from rest_framework import serializers
from .models import Goal


class GoalSerializer(serializers.ModelSerializer):
    percentage = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = [
            'id', 'name', 'target_amount', 'current_amount', 'deadline',
            'status', 'percentage', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']

    def validate_target_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Target amount must be greater than 0.')
        return value

    def validate_current_amount(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Current amount cannot be negative.')
        return value

    def get_percentage(self, obj):
        if not obj.target_amount:
            return 0
        pct = float(obj.current_amount) / float(obj.target_amount) * 100
        return round(min(pct, 100), 1)
