from django.conf import settings
from django.db import models


class Expense(models.Model):
    class Category(models.TextChoices):
        FOOD = 'food', 'Food'
        TRAVEL = 'travel', 'Travel'
        BILLS = 'bills', 'Bills'
        SHOPPING = 'shopping', 'Shopping'
        ENTERTAINMENT = 'entertainment', 'Entertainment'
        HEALTHCARE = 'healthcare', 'Healthcare'
        EDUCATION = 'education', 'Education'
        TRANSPORT = 'transport', 'Transport'
        OTHER = 'other', 'Other'

    class PaymentMethod(models.TextChoices):
        CASH = 'cash', 'Cash'
        CARD = 'card', 'Card'
        UPI = 'upi', 'UPI'

    # Every expense belongs to exactly one user; this is what makes
    # per-user data isolation possible (see expenses/permissions.py + views.py).
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expenses',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=20, choices=Category.choices)
    date = models.DateField()
    description = models.CharField(max_length=255, blank=True, default='')
    payment_method = models.CharField(max_length=10, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'category']),
        ]

    def __str__(self):
        return f'{self.user_id} · {self.category} · {self.amount}'
