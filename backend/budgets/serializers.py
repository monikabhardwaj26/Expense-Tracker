from datetime import date
from django.db.models import Sum
from rest_framework import serializers
from expenses.models import Expense
from .models import Budget


class BudgetSerializer(serializers.ModelSerializer):
    spent = serializers.SerializerMethodField()
    remaining = serializers.SerializerMethodField()
    percentage_used = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = [
            'id', 'category', 'amount', 'month',
            'spent', 'remaining', 'percentage_used', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Budget amount must be greater than 0.')
        return value

    def validate_month(self, value):
        # Normalize to the first of the month so "one budget per category
        # per month" constraint behaves predictably regardless of what day
        # the client sends.
        return value.replace(day=1)

    def _spent(self, obj):
        month_start = obj.month.replace(day=1)
        if month_start.month == 12:
            next_month = month_start.replace(year=month_start.year + 1, month=1)
        else:
            next_month = month_start.replace(month=month_start.month + 1)
        total = Expense.objects.filter(
            user=obj.user, category=obj.category,
            date__gte=month_start, date__lt=next_month,
        ).aggregate(total=Sum('amount'))['total']
        return total or 0

    def get_spent(self, obj):
        return self._spent(obj)

    def get_remaining(self, obj):
        return obj.amount - self._spent(obj)

    def get_percentage_used(self, obj):
        spent = self._spent(obj)
        if obj.amount == 0:
            return 0
        return round(float(spent) / float(obj.amount) * 100, 1)

    def get_status(self, obj):
        pct = self.get_percentage_used(obj)
        if pct >= 100:
            return 'exceeded'
        if pct >= 80:
            return 'approaching'
        return 'normal'
