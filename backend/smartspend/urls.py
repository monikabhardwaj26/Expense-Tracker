from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/', include('expenses.urls')),
    path('api/', include('budgets.urls')),
    path('api/', include('goals.urls')),
    path('api/', include('bills.urls')),
    path('api/', include('reports.urls')),
    path('api/', include('ai.urls')),
    path('api/', include('predictions.urls')),
    path('api/', include('receipts.urls')),
]
