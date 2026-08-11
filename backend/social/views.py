from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Count, Exists, OuterRef
from .models import Review, Comment, Reaction
from .serializers import ReviewSerializer, CommentSerializer
from books.models import Books
from django.shortcuts import get_object_or_404

class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        book_id = self.kwargs['book_id']
        qs = Review.objects.filter(book_id=book_id).select_related('user_id').annotate(
            likes_count=Count('reactions', distinct=True),
            comments_count=Count('comments', distinct=True)
        )
        if self.request.user.is_authenticated:
            # Annotate if current user liked
            has_liked = Reaction.objects.filter(review_id=OuterRef('pk'), user_id=self.request.user)
            qs = qs.annotate(user_has_liked=Exists(has_liked))
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        book_id = self.kwargs['book_id']
        book = get_object_or_404(Books, id=book_id)
        serializer.save(user_id=self.request.user, book_id=book)

class ReviewRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Users can only update/delete their own reviews
        return Review.objects.filter(user_id=self.request.user)

class ReactionView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, review_id):
        review = get_object_or_404(Review, id=review_id)
        Reaction.objects.get_or_create(user_id=request.user, review_id=review, reaction='LIKE')
        return Response({"status": "liked"}, status=status.HTTP_201_CREATED)

    def delete(self, request, review_id):
        review = get_object_or_404(Review, id=review_id)
        Reaction.objects.filter(user_id=request.user, review_id=review, reaction='LIKE').delete()
        return Response({"status": "unliked"}, status=status.HTTP_204_NO_CONTENT)

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        review_id = self.kwargs['review_id']
        return Comment.objects.filter(review_id=review_id).select_related('user_id').order_by('created_at')

    def perform_create(self, serializer):
        review_id = self.kwargs['review_id']
        review = get_object_or_404(Review, id=review_id)
        serializer.save(user_id=self.request.user, review_id=review)
