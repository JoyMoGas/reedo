"""
@project Reedo
@module views
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-05-21
"""
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAuthenticated
from django.db.models import Count, Exists, OuterRef
from .models import Review, Comment, Reaction, Echo, Follow, Friendship, Notification
from .serializers import ReviewSerializer, CommentSerializer, EchoSerializer, FriendshipSerializer, NotificationSerializer
from books.models import Books, UserBook
from books.serializers import UserBookSerializer
from django.shortcuts import get_object_or_404

class FriendsJourneysView(generics.ListAPIView):
    serializer_class = UserBookSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Get users the current user is following
        following = Follow.objects.filter(follower_id=self.request.user).values_list('followed_id', flat=True)
        # Get their currently reading books
        return UserBook.objects.filter(user_id__in=following, status='CURRENTLY_READING').select_related('user_id', 'book_id').order_by('-last_read_at')


class EchoListCreateView(generics.ListCreateAPIView):
    serializer_class = EchoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Echo.objects.select_related('user_id', 'shared_book').annotate(
            likes_count=Count('reactions', distinct=True),
            comments_count=Count('comments', distinct=True)
        )
        if self.request.user.is_authenticated:
            has_liked = Reaction.objects.filter(echo_id=OuterRef('pk'), user_id=self.request.user)
            qs = qs.annotate(user_has_liked=Exists(has_liked))
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        shared_book_id = serializer.validated_data.pop('shared_book_id', None)
        book = None
        if shared_book_id:
            book = get_object_or_404(Books, id=shared_book_id)
        serializer.save(user_id=self.request.user, shared_book=book)


class EchoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Echo.objects.all()
    serializer_class = EchoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Echo.objects.filter(user_id=self.request.user)

class EchoReactionView(views.APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, echo_id):
        echo = get_object_or_404(Echo, id=echo_id)
        reaction, created = Reaction.objects.get_or_create(user_id=request.user, echo_id=echo, reaction='LIKE')
        
        if created and echo.user_id != request.user:
            # Create notification
            notif = Notification.objects.create(
                recipient=echo.user_id,
                sender=request.user,
                notification_type='ECHO_LIKE',
                message=f"{request.user.full_name or request.user.username} liked your post.",
                echo=echo
            )
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{echo.user_id.id}",
                {
                    "type": "notification.message",
                    "notification_type": "ECHO_LIKE",
                    "message": notif.message
                }
            )

        return Response({"status": "liked"}, status=status.HTTP_201_CREATED)

    def delete(self, request, echo_id):
        echo = get_object_or_404(Echo, id=echo_id)
        Reaction.objects.filter(user_id=request.user, echo_id=echo, reaction='LIKE').delete()
        Notification.objects.filter(sender=request.user, recipient=echo.user_id, notification_type='ECHO_LIKE', echo=echo).delete()
        return Response({"status": "unliked"}, status=status.HTTP_204_NO_CONTENT)

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
        reaction, created = Reaction.objects.get_or_create(user_id=request.user, review_id=review, reaction='LIKE')

        if created and review.user_id != request.user:
            notif = Notification.objects.create(
                recipient=review.user_id,
                sender=request.user,
                notification_type='REVIEW_LIKE',
                message=f"{request.user.full_name or request.user.username} liked your review.",
                review=review
            )
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"user_{review.user_id.id}",
                {
                    "type": "notification.message",
                    "notification_type": "REVIEW_LIKE",
                    "message": notif.message
                }
            )

        return Response({"status": "liked"}, status=status.HTTP_201_CREATED)

    def delete(self, request, review_id):
        review = get_object_or_404(Review, id=review_id)
        Reaction.objects.filter(user_id=request.user, review_id=review, reaction='LIKE').delete()
        Notification.objects.filter(sender=request.user, recipient=review.user_id, notification_type='REVIEW_LIKE', review=review).delete()
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

class EchoCommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        echo_id = self.kwargs['echo_id']
        return Comment.objects.filter(echo_id=echo_id).select_related('user_id').order_by('created_at')

    def perform_create(self, serializer):
        echo_id = self.kwargs['echo_id']
        echo = get_object_or_404(Echo, id=echo_id)
        serializer.save(user_id=self.request.user, echo_id=echo)

# ===================================================================
# Friendship Views
# ===================================================================
from django.contrib.auth import get_user_model
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = get_user_model()

class FriendshipPendingListView(generics.ListAPIView):
    """
    List all pending incoming requests for the authenticated user.
    """
    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Friendship.objects.filter(receiver=self.request.user, status='PENDING').order_by('-created_at')

class FriendshipListView(generics.ListAPIView):
    """
    List all accepted friends for a specific user.
    We return the Friendship objects where status='ACCEPTED' and the user is either requester or receiver.
    """
    serializer_class = FriendshipSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        user = get_object_or_404(User, id=user_id)
        return Friendship.objects.filter(
            Q(requester=user) | Q(receiver=user),
            status='ACCEPTED'
        ).order_by('-updated_at')

class FriendshipStatusView(views.APIView):
    """
    Get the friendship status between the authenticated user and another user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        if request.user == target_user:
            return Response({"status": "SELF"})
        
        friendship = Friendship.objects.filter(
            (Q(requester=request.user) & Q(receiver=target_user)) |
            (Q(requester=target_user) & Q(receiver=request.user))
        ).first()

        if friendship:
            return Response({"status": friendship.status})
        return Response({"status": "NONE"})

class FriendshipRequestView(views.APIView):
    """
    Send a friend request to another user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        if not receiver_id:
            return Response({"error": "receiver_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        receiver = get_object_or_404(User, id=receiver_id)
        if request.user == receiver:
            return Response({"error": "Cannot send friend request to yourself"}, status=status.HTTP_400_BAD_REQUEST)

        friendship, created = Friendship.objects.get_or_create(
            requester=request.user,
            receiver=receiver,
            defaults={'status': 'PENDING'}
        )
        if not created:
            if friendship.status == 'REJECTED':
                # Re-activate the request
                friendship.status = 'PENDING'
                friendship.save()
            elif friendship.status == 'PENDING':
                return Response({"error": "Request already pending"}, status=status.HTTP_400_BAD_REQUEST)
            elif friendship.status == 'ACCEPTED':
                return Response({"error": "Already friends"}, status=status.HTTP_400_BAD_REQUEST)

        # Create notification record
        notif, _ = Notification.objects.get_or_create(
            recipient=receiver,
            sender=request.user,
            notification_type='FRIEND_REQUEST',
            friendship=friendship,
            defaults={'message': f"{request.user.full_name or request.user.username} sent you a friend request."}
        )

        # Broadcast to receiver
        print(f"Broadcasting FRIEND_REQUEST_RECEIVED to user_{receiver.id}")
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{receiver.id}",
            {
                "type": "notification.message",
                "notification_type": "FRIEND_REQUEST_RECEIVED",
                "message": notif.message
            }
        )

        return Response(FriendshipSerializer(friendship).data, status=status.HTTP_201_CREATED)

class FriendshipAcceptView(views.APIView):
    """
    Accept a pending friend request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        friendship = get_object_or_404(Friendship, id=request_id, receiver=request.user, status='PENDING')
        friendship.status = 'ACCEPTED'
        friendship.save()

        # Create notification for the requester
        notif = Notification.objects.create(
            recipient=friendship.requester,
            sender=request.user,
            notification_type='FRIEND_ACCEPT',
            message=f"{request.user.full_name or request.user.username} accepted your friend request.",
            friendship=friendship
        )

        # Broadcast to requester
        print(f"Broadcasting FRIEND_REQUEST_ACCEPTED to user_{friendship.requester.id}")
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{friendship.requester.id}",
            {
                "type": "notification.message",
                "notification_type": "FRIEND_REQUEST_ACCEPTED",
                "message": notif.message
            }
        )

        return Response(FriendshipSerializer(friendship).data, status=status.HTTP_200_OK)

class FriendshipRejectView(views.APIView):
    """
    Reject a pending friend request.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        friendship = get_object_or_404(Friendship, id=request_id, receiver=request.user, status='PENDING')
        friendship.status = 'REJECTED'
        friendship.save()

        notif = Notification.objects.create(
            recipient=friendship.requester,
            sender=request.user,
            notification_type='FRIEND_REJECT',
            message=f"{request.user.full_name or request.user.username} rejected your friend request.",
            friendship=friendship
        )

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"user_{friendship.requester.id}",
            {
                "type": "notification.message",
                "notification_type": "FRIEND_REQUEST_REJECTED",
                "message": notif.message
            }
        )

        return Response(FriendshipSerializer(friendship).data, status=status.HTTP_200_OK)

class FriendshipRemoveView(views.APIView):
    """
    Remove an accepted friend.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        target_user = get_object_or_404(User, id=user_id)
        friendships = Friendship.objects.filter(
            (Q(requester=request.user) & Q(receiver=target_user)) |
            (Q(requester=target_user) & Q(receiver=request.user)),
            status='ACCEPTED'
        )
        if not friendships.exists():
            return Response({"error": "You are not friends with this user."}, status=status.HTTP_400_BAD_REQUEST)
        
        friendships.delete()
        return Response({"status": "friend removed"}, status=status.HTTP_204_NO_CONTENT)

# ===================================================================
# Notifications Views
# ===================================================================

class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

class NotificationReadView(views.APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        notif = get_object_or_404(Notification, id=pk, recipient=request.user)
        notif.is_read = True
        notif.save()
        return Response(NotificationSerializer(notif).data, status=status.HTTP_200_OK)

