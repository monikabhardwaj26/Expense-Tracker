from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ExpenseViewSet, DashboardView

router = DefaultRouter()
router.register('expenses', ExpenseViewSet, basename='expense')

urlpatterns = [
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('', include(router.urls)),
]
