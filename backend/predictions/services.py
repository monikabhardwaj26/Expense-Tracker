"""
Machine Learning fundamentals, kept deliberately simple and transparent:

1. Data preparation — pull the user's real Expense rows, grouped by month.
2. Feature creation — turn each month into (month_index, total_spent).
3. Model training — ordinary least-squares simple linear regression,
   computed by hand (no external ML library needed) over those points.
4. Prediction — evaluate the fitted line one month past the last one seen.
5. Result handling — refuse to predict on too little history rather than
   guessing, and report goodness-of-fit (R²) so the number is never
   presented as more certain than it is.

This intentionally avoids scikit-learn/numpy so the feature has no extra
install requirements beyond what's already in requirements.txt — the math
itself is what demonstrates the ML fundamentals, not the library.
"""
from django.db.models import Sum
from django.db.models.functions import TruncMonth

from expenses.models import Expense

MIN_MONTHS_REQUIRED = 3


def _monthly_totals(user):
    rows = (
        Expense.objects.filter(user=user)
        .annotate(month=TruncMonth('date'))
        .values('month')
        .annotate(total=Sum('amount'))
        .order_by('month')
    )
    return [(row['month'], float(row['total'])) for row in rows if row['month'] is not None]


def _simple_linear_regression(xs, ys):
    """Closed-form ordinary least squares for y = a + b*x. Returns (a, b, r_squared)."""
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n

    ss_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    ss_xx = sum((x - mean_x) ** 2 for x in xs)

    if ss_xx == 0:
        # All x values identical (shouldn't happen with sequential month
        # indices) — fall back to a flat line at the mean.
        return mean_y, 0.0, 0.0

    b = ss_xy / ss_xx
    a = mean_y - b * mean_x

    ss_tot = sum((y - mean_y) ** 2 for y in ys)
    if ss_tot == 0:
        r_squared = 1.0 if all(y == ys[0] for y in ys) else 0.0
    else:
        ss_res = sum((y - (a + b * x)) ** 2 for x, y in zip(xs, ys))
        r_squared = max(0.0, 1 - ss_res / ss_tot)

    return a, b, r_squared


def predict_next_month_spending(user):
    """
    Returns a dict describing the prediction, or a dict with
    available=False and a plain-language reason when there isn't enough
    real history to predict responsibly. Never fabricates history to make
    the model "work".
    """
    history = _monthly_totals(user)

    if len(history) < MIN_MONTHS_REQUIRED:
        return {
            'available': False,
            'message': 'Not enough historical data to generate a reliable spending prediction.',
            'months_of_history': len(history),
            'months_required': MIN_MONTHS_REQUIRED,
        }

    months = [m.strftime('%Y-%m') for m, _ in history]
    totals = [t for _, t in history]
    xs = list(range(len(totals)))

    a, b, r_squared = _simple_linear_regression(xs, totals)
    next_index = len(totals)
    predicted = a + b * next_index
    predicted = max(0.0, predicted)  # spending can't be negative

    last_month = history[-1][0]
    next_month_num = last_month.month + 1
    next_year = last_month.year + (1 if next_month_num > 12 else 0)
    next_month_num = 1 if next_month_num > 12 else next_month_num

    return {
        'available': True,
        'method': 'linear_regression',
        'history': [{'month': m, 'total': t} for m, t in zip(months, totals)],
        'predicted_month': f'{next_year:04d}-{next_month_num:02d}',
        'predicted_amount': round(predicted, 2),
        'r_squared': round(r_squared, 3),
        'confidence_note': (
            'This is a simple trend-based estimate, not a guarantee — '
            'treat it as a rough planning figure.'
        ),
    }
