from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['user', 'category', 'amount', 'date', 'payment_method']
    list_filter = ['category', 'payment_method']
    search_fields = ['description', 'user__email']
