from django.conf import settings
from django.db import models
from expenses.models import Expense


class Budget(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='budgets',
    )
    category = models.CharField(max_length=20, choices=Expense.Category.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    # Stored as the first day of the budgeted month, e.g. 2026-09-01.
    month = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-month', 'category']
        # One budget per category per month, per user.
        constraints = [
            models.UniqueConstraint(fields=['user', 'category', 'month'], name='unique_budget_per_category_month')
        ]

    def __str__(self):
        return f'{self.user_id} · {self.category} · {self.month:%Y-%m}'
