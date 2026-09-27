import csv
import io
from datetime import date

from django.http import HttpResponse
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import build_monthly_report


def _parse_month(request):
    raw = request.query_params.get('month')
    if raw:
        try:
            year, month = int(raw[:4]), int(raw[5:7])
            return year, month
        except (ValueError, IndexError):
            return None, None
    today = timezone.localdate()
    return today.year, today.month


class MonthlyReportView(APIView):
    """GET /api/reports/monthly/?month=YYYY-MM"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year, month = _parse_month(request)
        if not year:
            return Response({'detail': 'month must be in YYYY-MM format.'}, status=status.HTTP_400_BAD_REQUEST)
        report = build_monthly_report(request.user, year, month)
        return Response(report)


class MonthlyReportDownloadView(APIView):
    """
    GET /api/reports/monthly/download/?month=YYYY-MM
    Returns the same data as MonthlyReportView as a downloadable CSV — a
    plain-text format any spreadsheet app can open, generated straight from
    the same service function (so figures always match the on-screen report).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        year, month = _parse_month(request)
        if not year:
            return Response({'detail': 'month must be in YYYY-MM format.'}, status=status.HTTP_400_BAD_REQUEST)
        report = build_monthly_report(request.user, year, month)

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(['SmartSpend AI — Monthly Report'])
        writer.writerow(['Month', report['month']])
        writer.writerow(['User', request.user.email])
        writer.writerow([])
        writer.writerow(['Total Expenses', report['total_expenses']])
        writer.writerow([])
        writer.writerow(['Category', 'Amount Spent'])
        for row in report['category_breakdown']:
            writer.writerow([row['category'], row['total']])
        writer.writerow([])
        writer.writerow(['Budget Summary'])
        writer.writerow(['Category', 'Budget', 'Spent', 'Remaining'])
        for row in report['budget_summary']:
            writer.writerow([row['category'], row['budget'], row['spent'], row['remaining']])

        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="smartspend-report-{report["month"]}.csv"'
        return response
