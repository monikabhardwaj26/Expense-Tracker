from django.urls import path
from .views import ChatView, InsightsView

urlpatterns = [
    path('ai/chat/', ChatView.as_view(), name='ai-chat'),
    path('ai/insights/', InsightsView.as_view(), name='ai-insights'),
]
