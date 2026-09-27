from django.utils import timezone
from rest_framework import serializers
from .models import Bill


class BillSerializer(serializers.ModelSerializer):
    computed_status = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = [
            'id', 'name', 'amount', 'due_date', 'recurrence', 'category',
            'status', 'computed_status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Amount must be greater than 0.')
        return value

    def get_computed_status(self, obj):
        # `status` is the source of truth for "paid" (set explicitly via the
        # mark-paid action). Otherwise it's derived from today's date so an
        # unpaid bill automatically shows as overdue once its due date passes.
        if obj.status == Bill.Status.PAID:
            return 'paid'
        if obj.due_date < timezone.localdate():
            return 'overdue'
        return 'upcoming'
