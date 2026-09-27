from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import predict_next_month_spending


class MonthlyPredictionView(APIView):
    """GET /api/predictions/monthly/ — real linear-regression estimate from
    the logged-in user's own historical Expense data. See predictions/services.py
    for the (deliberately simple, transparent) model."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(predict_next_month_spending(request.user))
