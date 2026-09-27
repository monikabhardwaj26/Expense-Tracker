from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import (
    AIServiceError,
    answer_chat_message,
    build_financial_context,
    call_ai,
    generate_rule_based_insights,
)

GENERIC_AI_ERROR = 'AI service is temporarily unavailable. Please try again.'


class ChatView(APIView):
    """
    POST /api/ai/chat/  { "message": "..." }

    React never talks to the AI directly. This view authenticates the
    request, pulls only *this* user's real financial data (see
    ai/services.py), sends it + their message to the AI service, and
    returns the reply. The AI API key lives in the backend's environment
    only — it is never sent to or readable by the frontend.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'detail': 'message is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(message) > 2000:
            return Response({'detail': 'message is too long.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            reply = answer_chat_message(request.user, message)
        except AIServiceError:
            # Never leak the underlying exception (could reveal config
            # details, stack traces, or the AI provider's raw error) to
            # the client — just the clean, generic message the UX asked for.
            return Response({'detail': GENERIC_AI_ERROR}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({'reply': reply})


class InsightsView(APIView):
    """
    GET /api/ai/insights/

    Always computes real, rule-based insights from the database first
    (see generate_rule_based_insights). If an AI key is configured, it
    asks the AI to rephrase those exact facts more naturally — it is not
    allowed to add facts of its own. If the AI service is unavailable,
    the plain rule-based messages are returned as-is, which is still
    useful and never fake.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        context = build_financial_context(request.user)
        facts = generate_rule_based_insights(context)

        if not facts:
            return Response({'insights': [], 'ai_phrased': False})

        try:
            system_prompt = (
                "Rewrite each of the following factual financial insights as one "
                "short, warm, natural-language sentence each. Do not add, remove, "
                "or change any number or fact — only improve the phrasing. Return "
                "them as a numbered list, one per line, same order, same count.\n\n"
                + '\n'.join(f"- {f['message']}" for f in facts)
            )
            phrased = call_ai(system_prompt, 'Please rephrase these insights.')
            lines = [l.strip(' -0123456789.') for l in phrased.splitlines() if l.strip()]
            if len(lines) == len(facts):
                for fact, line in zip(facts, lines):
                    fact['message'] = line
                return Response({'insights': facts, 'ai_phrased': True})
        except AIServiceError:
            pass  # fall through to the plain, rule-based facts below

        return Response({'insights': facts, 'ai_phrased': False})
