from django.urls import path
from .views import ReviewListCreateView, ReviewRetrieveUpdateDestroyView, ReactionView, CommentListCreateView

urlpatterns = [
    path('books/<uuid:book_id>/reviews/', ReviewListCreateView.as_view(), name='book-reviews'),
    path('reviews/<uuid:pk>/', ReviewRetrieveUpdateDestroyView.as_view(), name='review-detail'),
    path('reviews/<uuid:review_id>/like/', ReactionView.as_view(), name='review-like'),
    path('reviews/<uuid:review_id>/comments/', CommentListCreateView.as_view(), name='review-comments'),
]
