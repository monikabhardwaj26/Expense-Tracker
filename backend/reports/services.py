"""
Shared logic for building a monthly financial report from real database
records. Used by both the JSON endpoint and the downloadable-report
endpoint so the two can never drift apart / show different numbers.
"""
from calendar import monthrange
from datetime import date

from django.db.models import Sum

from expenses.models import Expense
from budgets.models import Budget


def build_monthly_report(user, year, month):
    month_start = date(year, month, 1)
    month_end = date(year, month, monthrange(year, month)[1])

    expenses = Expense.objects.filter(user=user, date__gte=month_start, date__lte=month_end)
    total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or 0

    category_breakdown = list(
        expenses.values('category').annotate(total=Sum('amount')).order_by('-total')
    )
    highest_category = category_breakdown[0] if category_breakdown else None

    budgets = Budget.objects.filter(user=user, month=month_start)
    budget_summary = []
    for b in budgets:
        spent = expenses.filter(category=b.category).aggregate(total=Sum('amount'))['total'] or 0
        budget_summary.append({
            'category': b.category,
            'budget': b.amount,
            'spent': spent,
            'remaining': b.amount - spent,
        })

    return {
        'month': month_start.strftime('%Y-%m'),
        'total_expenses': total_expenses,
        # No income-entry feature exists yet in this app, so we do not
        # invent an income figure or a "balance" derived from one.
        'income_tracked': False,
        'category_breakdown': category_breakdown,
        'highest_spending_category': highest_category,
        'budget_summary': budget_summary,
    }
