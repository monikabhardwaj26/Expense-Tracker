from django.db.models import Sum
from django.utils import timezone
from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Expense
from .permissions import IsOwner
from .serializers import ExpenseSerializer, ExpenseSerializer as ExpenseSerializerLite


class ExpenseViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for expenses, always scoped to the logged-in user.

    Security: get_queryset() filters by request.user on every action
    (list/retrieve/update/delete), and IsOwner double-checks on the object
    itself, so a request for /api/expenses/<someone-elses-id>/ returns 404
    rather than another user's data.
    """
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'category']
    ordering_fields = ['date', 'amount', 'created_at']
    ordering = ['-date']

    def get_queryset(self):
        qs = Expense.objects.filter(user=self.request.user)

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            qs = qs.filter(payment_method=payment_method)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(date__lte=date_to)

        amount_min = self.request.query_params.get('amount_min')
        if amount_min:
            qs = qs.filter(amount__gte=amount_min)

        amount_max = self.request.query_params.get('amount_max')
        if amount_max:
            qs = qs.filter(amount__lte=amount_max)

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DashboardView(APIView):
    """
    GET /api/dashboard/ — real, computed-from-the-database summary for the
    logged-in user. No hardcoded/fake numbers.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Local imports to avoid a hard import-time dependency between apps
        # (expenses doesn't need budgets/goals/bills installed to run on
        # its own; the dashboard just uses them if they're present).
        from budgets.models import Budget
        from budgets.serializers import BudgetSerializer
        from goals.models import Goal
        from goals.serializers import GoalSerializer
        from bills.models import Bill
        from bills.serializers import BillSerializer

        user = request.user
        today = timezone.localdate()
        month_start = today.replace(day=1)

        all_expenses = Expense.objects.filter(user=user)
        month_expenses = all_expenses.filter(date__gte=month_start, date__lte=today)

        total_balance = all_expenses.aggregate(total=Sum('amount'))['total'] or 0
        monthly_spending = month_expenses.aggregate(total=Sum('amount'))['total'] or 0

        category_breakdown = list(
            month_expenses.values('category')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )

        recent_transactions = ExpenseSerializerLite(
            all_expenses.order_by('-date', '-created_at')[:5], many=True
        ).data

        budgets = BudgetSerializer(
            Budget.objects.filter(user=user, month=month_start), many=True
        ).data

        goals = GoalSerializer(
            Goal.objects.filter(user=user, status=Goal.Status.IN_PROGRESS).order_by('-created_at')[:3],
            many=True,
        ).data

        upcoming_bills = BillSerializer(
            Bill.objects.filter(user=user).exclude(status=Bill.Status.PAID).order_by('due_date')[:5],
            many=True,
        ).data

        return Response({
            'total_balance': total_balance,
            'monthly_spending': monthly_spending,
            'category_breakdown': category_breakdown,
            'recent_transactions': recent_transactions,
            'budgets': budgets,
            'goals': goals,
            'upcoming_bills': upcoming_bills,
            # AI insights and the ML spending prediction are NOT included here —
            # they're computed by their own endpoints (GET /api/ai/insights/,
            # GET /api/predictions/monthly/) so a slow/unavailable AI call never
            # blocks the core dashboard from loading. The frontend fetches them
            # separately alongside this response.
        })

