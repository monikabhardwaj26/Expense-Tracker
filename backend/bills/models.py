from django.conf import settings
from django.db import models
from expenses.models import Expense


class Bill(models.Model):
    class Recurrence(models.TextChoices):
        ONE_TIME = 'one_time', 'One-time'
        WEEKLY = 'weekly', 'Weekly'
        MONTHLY = 'monthly', 'Monthly'
        YEARLY = 'yearly', 'Yearly'

    class Status(models.TextChoices):
        UPCOMING = 'upcoming', 'Upcoming'
        PAID = 'paid', 'Paid'
        OVERDUE = 'overdue', 'Overdue'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bills',
    )
    name = models.CharField(max_length=150)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField()
    recurrence = models.CharField(max_length=10, choices=Recurrence.choices, default=Recurrence.MONTHLY)
    category = models.CharField(max_length=20, choices=Expense.Category.choices, default=Expense.Category.BILLS)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UPCOMING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f'{self.user_id} · {self.name}'
