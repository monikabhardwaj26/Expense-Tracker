from django.urls import path
from .views import MonthlyReportView, MonthlyReportDownloadView

urlpatterns = [
    path('reports/monthly/', MonthlyReportView.as_view(), name='report-monthly'),
    path('reports/monthly/download/', MonthlyReportDownloadView.as_view(), name='report-monthly-download'),
]
