from django.conf import settings
from django.db import models


class Goal(models.Model):
    class Status(models.TextChoices):
        IN_PROGRESS = 'in_progress', 'In progress'
        COMPLETED = 'completed', 'Completed'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='goals',
    )
    name = models.CharField(max_length=150)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deadline = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.IN_PROGRESS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Keep status consistent with progress automatically.
        if self.current_amount >= self.target_amount and self.target_amount > 0:
            self.status = self.Status.COMPLETED
        elif self.status == self.Status.COMPLETED and self.current_amount < self.target_amount:
            self.status = self.Status.IN_PROGRESS
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user_id} · {self.name}'
