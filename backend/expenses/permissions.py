from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Object-level permission: only the expense's owner may view/edit/delete it.
    Combined with the queryset filtering in views.py (request.user), this is
    the second layer that stops user A from reaching user B's expense by
    guessing/changing an ID in the URL.
    """

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id
