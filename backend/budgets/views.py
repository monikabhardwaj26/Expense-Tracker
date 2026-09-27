from rest_framework import viewsets, permissions
from .models import Budget
from .serializers import BudgetSerializer


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = Budget.objects.filter(user=self.request.user)
        month = self.request.query_params.get('month')
        if month:
            qs = qs.filter(month__year=month[:4], month__month=month[5:7])
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
