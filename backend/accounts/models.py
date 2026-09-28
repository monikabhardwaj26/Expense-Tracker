from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.db import models

class UserManager(BaseUserManager):
    """Manager that creates users with email as the login field."""

    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError('Users must have an email address')
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, name, password, **extra_fields)


class User(AbstractUser):
    """
    Custom user model. Email is the unique login identifier instead of
    Django's default `username`. Password hashing/storage is handled by
    AbstractUser (never stored or exposed in plain text).
    """
    username = None  # drop the default username field
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=150)

    # Optional profile info
    currency = models.CharField(max_length=8, default='INR')

    class Theme(models.TextChoices):
        LIGHT = 'light', 'Light'
        DARK = 'dark', 'Dark'

    theme = models.CharField(max_length=5, choices=Theme.choices, default=Theme.LIGHT)
    notifications_enabled = models.BooleanField(default=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    def __str__(self):
        return self.email
