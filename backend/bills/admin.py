from django.contrib import admin
from .models import Bill


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ['user', 'name', 'amount', 'due_date', 'status', 'recurrence']
    list_filter = ['status', 'recurrence']
