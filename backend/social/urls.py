"""
@project Reedo
@module urls
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-08-10
"""
from django.urls import path
from .views import (
    ReviewListCreateView, ReviewRetrieveUpdateDestroyView, ReactionView, 
    CommentListCreateView, EchoListCreateView, EchoReactionView, EchoRetrieveUpdateDestroyView, 
    FriendsJourneysView, EchoCommentListCreateView,
    FriendshipPendingListView, FriendshipListView, FriendshipStatusView, 
    FriendshipRequestView, FriendshipAcceptView, FriendshipRejectView, FriendshipRemoveView,
    NotificationListView, NotificationReadView
)

urlpatterns = [
    path('friends-journeys/', FriendsJourneysView.as_view(), name='friends-journeys'),
    path('echoes/', EchoListCreateView.as_view(), name='echoes-list-create'),
    path('echoes/<uuid:pk>/', EchoRetrieveUpdateDestroyView.as_view(), name='echo-detail'),
    path('echoes/<uuid:echo_id>/like/', EchoReactionView.as_view(), name='echo-like'),
    path('echoes/<uuid:echo_id>/comments/', EchoCommentListCreateView.as_view(), name='echo-comments'),
    path('books/<uuid:book_id>/reviews/', ReviewListCreateView.as_view(), name='book-reviews'),
    path('reviews/<uuid:pk>/', ReviewRetrieveUpdateDestroyView.as_view(), name='review-detail'),
    path('reviews/<uuid:review_id>/like/', ReactionView.as_view(), name='review-like'),
    path('reviews/<uuid:review_id>/comments/', CommentListCreateView.as_view(), name='review-comments'),
    
    # Friendship endpoints
    path('friends/pending/', FriendshipPendingListView.as_view(), name='friends-pending'),
    path('friends/request/', FriendshipRequestView.as_view(), name='friends-request'),
    path('friends/accept/<uuid:request_id>/', FriendshipAcceptView.as_view(), name='friends-accept'),
    path('friends/reject/<uuid:request_id>/', FriendshipRejectView.as_view(), name='friends-reject'),
    path('friends/status/<uuid:user_id>/', FriendshipStatusView.as_view(), name='friends-status'),
    path('friends/remove/<uuid:user_id>/', FriendshipRemoveView.as_view(), name='friends-remove'),
    path('friends/<uuid:user_id>/', FriendshipListView.as_view(), name='friends-list'),

    # Notifications
    path('notifications/', NotificationListView.as_view(), name='notifications-list'),
    path('notifications/<uuid:pk>/read/', NotificationReadView.as_view(), name='notifications-read'),
]
