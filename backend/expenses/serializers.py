from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            'id', 'amount', 'category', 'date', 'description',
            'payment_method', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Amount must be greater than 0.')
        return value

    def validate(self, attrs):
        # date is required by the model (no null=True), DRF already enforces
        # presence; this adds an explicit, friendlier message.
        if 'date' in attrs and attrs['date'] is None:
            raise serializers.ValidationError({'date': 'Date is required.'})
        return attrs
