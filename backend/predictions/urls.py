from django.urls import path
from .views import MonthlyPredictionView

urlpatterns = [
    path('predictions/monthly/', MonthlyPredictionView.as_view(), name='predictions-monthly'),
]
