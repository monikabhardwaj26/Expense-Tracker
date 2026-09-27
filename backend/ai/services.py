"""
Everything here follows one rule: **numbers come from Django, words come
from the AI.**

`build_financial_context(user)` computes real facts from the database
(this month's spend, category breakdown, budget usage, recent transactions,
month-over-month trend, goals, upcoming bills). `call_ai()` sends those
facts to the AI service as a system prompt and asks it to answer using only
that data — never its own guesses. `generate_rule_based_insights()` derives
plain-English insights straight from the same facts without needing the AI
service at all, so Insights still work (in a more basic form) even if no AI
API key is configured.
"""
import json
from datetime import date, timedelta

from django.db.models import Sum
from django.utils import timezone

from expenses.models import Expense
from budgets.models import Budget
from goals.models import Goal
from bills.models import Bill


class AIServiceError(Exception):
    """Raised whenever the AI service can't be reached or fails. The view
    layer catches this and returns the person a clean, generic message —
    never the raw exception."""


def _month_bounds(d):
    start = d.replace(day=1)
    if start.month == 12:
        next_start = start.replace(year=start.year + 1, month=1)
    else:
        next_start = start.replace(month=start.month + 1)
    return start, next_start


def build_financial_context(user):
    """
    Computes real, per-user facts from the database. This is the ONLY
    source of financial figures the AI is given — it must not be asked to
    invent or estimate any of these numbers itself.
    """
    today = timezone.localdate()
    month_start, month_end_excl = _month_bounds(today)
    last_month_start, _ = _month_bounds(month_start - timedelta(days=1))

    all_expenses = Expense.objects.filter(user=user)
    this_month = all_expenses.filter(date__gte=month_start, date__lt=month_end_excl)
    last_month = all_expenses.filter(date__gte=last_month_start, date__lt=month_start)

    this_month_total = float(this_month.aggregate(t=Sum('amount'))['t'] or 0)
    last_month_total = float(last_month.aggregate(t=Sum('amount'))['t'] or 0)

    category_breakdown = [
        {'category': row['category'], 'total': float(row['total'])}
        for row in this_month.values('category').annotate(total=Sum('amount')).order_by('-total')
    ]

    recent_transactions = [
        {
            'date': str(e.date), 'category': e.category,
            'amount': float(e.amount), 'description': e.description,
        }
        for e in all_expenses.order_by('-date', '-created_at')[:5]
    ]

    budgets = []
    for b in Budget.objects.filter(user=user, month=month_start):
        spent = float(
            this_month.filter(category=b.category).aggregate(t=Sum('amount'))['t'] or 0
        )
        budgets.append({
            'category': b.category,
            'limit': float(b.amount),
            'spent': spent,
            'percentage_used': round(spent / float(b.amount) * 100, 1) if b.amount else 0,
        })

    goals = [
        {
            'name': g.name, 'target_amount': float(g.target_amount),
            'current_amount': float(g.current_amount), 'status': g.status,
        }
        for g in Goal.objects.filter(user=user).order_by('-created_at')[:5]
    ]

    upcoming_bills = [
        {'name': b.name, 'amount': float(b.amount), 'due_date': str(b.due_date)}
        for b in Bill.objects.filter(user=user).exclude(status=Bill.Status.PAID).order_by('due_date')[:5]
    ]

    return {
        'today': str(today),
        'this_month_total_spent': this_month_total,
        'last_month_total_spent': last_month_total,
        'category_breakdown_this_month': category_breakdown,
        'recent_transactions': recent_transactions,
        'budgets_this_month': budgets,
        'goals': goals,
        'upcoming_unpaid_bills': upcoming_bills,
    }


def _ai_credentials():
    from decouple import config
    api_key = config('AI_API_KEY', default='') or config('ANTHROPIC_API_KEY', default='')
    model = config('AI_MODEL_NAME', default='claude-3-5-haiku-latest')
    return api_key, model


def call_ai(system_prompt, user_message):
    """
    Sends the (already-computed) facts + the user's message to the AI
    service and returns its reply text. Raises AIServiceError on any
    failure — no API key configured, network error, bad response, etc.
    """
    api_key, model = _ai_credentials()
    if not api_key:
        raise AIServiceError('AI_API_KEY is not configured on the backend.')

    try:
        import anthropic
    except ImportError as exc:
        raise AIServiceError(
            "The 'anthropic' package is not installed. Add it to requirements.txt "
            "and run `pip install -r requirements.txt`."
        ) from exc

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=500,
            system=system_prompt,
            messages=[{'role': 'user', 'content': user_message}],
        )
        parts = [block.text for block in response.content if getattr(block, 'type', None) == 'text']
        text = '\n'.join(parts).strip()
        if not text:
            raise AIServiceError('AI service returned an empty response.')
        return text
    except AIServiceError:
        raise
    except Exception as exc:  # network errors, auth errors, rate limits, etc.
        raise AIServiceError(str(exc)) from exc


def _system_prompt_for_chat(context):
    return (
        "You are SmartSpend AI's financial advisor. You must answer using ONLY "
        "the JSON facts given below — they come straight from the user's real "
        "database records. Never invent, estimate, or guess a number that isn't "
        "in this data; if the data doesn't cover what's asked, say so plainly "
        "instead of making a figure up. Keep replies short (2-4 sentences), warm, "
        "and practical.\n\n"
        f"USER FINANCIAL FACTS (JSON):\n{json.dumps(context, indent=2)}"
    )


def answer_chat_message(user, message):
    context = build_financial_context(user)
    system_prompt = _system_prompt_for_chat(context)
    return call_ai(system_prompt, message)


def generate_rule_based_insights(context):
    """
    Derives plain-English insights directly from computed facts — no AI
    call required. This is what /api/ai/insights/ falls back to (or uses
    as the factual basis it hands to the AI) so insights are never
    fabricated, only computed.
    """
    insights = []

    this_month = context['this_month_total_spent']
    last_month = context['last_month_total_spent']
    if last_month > 0:
        change_pct = round((this_month - last_month) / last_month * 100, 1)
        if change_pct >= 15:
            insights.append({
                'type': 'spending_increased',
                'message': f"Your spending this month is {change_pct}% higher than last month "
                           f"(₹{this_month:,.2f} vs ₹{last_month:,.2f}).",
            })
        elif change_pct <= -15:
            insights.append({
                'type': 'spending_decreased',
                'message': f"Your spending this month is {abs(change_pct)}% lower than last month "
                           f"(₹{this_month:,.2f} vs ₹{last_month:,.2f}). Nice work.",
            })

    for b in context['budgets_this_month']:
        pct = b['percentage_used']
        if pct >= 100:
            insights.append({
                'type': 'budget_exceeded',
                'message': f"Your {b['category']} budget is exceeded — "
                           f"₹{b['spent']:,.2f} spent against a ₹{b['limit']:,.2f} limit.",
            })
        elif pct >= 80:
            insights.append({
                'type': 'budget_nearing_limit',
                'message': f"Your {b['category']} budget is at {pct}% "
                           f"(₹{b['spent']:,.2f} of ₹{b['limit']:,.2f}).",
            })

    if context['category_breakdown_this_month']:
        top = context['category_breakdown_this_month'][0]
        if this_month > 0 and top['total'] / this_month >= 0.4:
            insights.append({
                'type': 'high_spending_category',
                'message': f"{top['category'].title()} is your biggest category this month at "
                           f"₹{top['total']:,.2f} — that's over 40% of your total spending.",
            })

    today = date.fromisoformat(context['today'])
    for bill in context['upcoming_unpaid_bills']:
        due = date.fromisoformat(bill['due_date'])
        days_away = (due - today).days
        if 0 <= days_away <= 7 and bill['amount'] >= 1000:
            insights.append({
                'type': 'upcoming_large_bill',
                'message': f"{bill['name']} (₹{bill['amount']:,.2f}) is due in {days_away} day(s).",
            })

    return insights
