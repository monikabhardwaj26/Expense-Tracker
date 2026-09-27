from django.urls import path
from .views import ScanReceiptView

urlpatterns = [
    path('receipts/scan/', ScanReceiptView.as_view(), name='receipts-scan'),
]
