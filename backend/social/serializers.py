"""
@project Reedo
@module serializers
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-08-10
"""
from rest_framework import serializers
from .models import Review, Comment, Reaction, Echo, Friendship, Notification
from users.serializers import UserSerializer
from books.serializers import BookSerializer

class EchoSerializer(serializers.ModelSerializer):
    user = UserSerializer(source='user_id', read_only=True)
    shared_book = BookSerializer(read_only=True)
    shared_book_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    likes_count = serializers.IntegerField(read_only=True, default=0)
    comments_count = serializers.IntegerField(read_only=True, default=0)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Echo
        fields = ['id', 'user', 'content', 'shared_book', 'shared_book_id', 'is_spoiler', 'created_at', 'updated_at', 'likes_count', 'comments_count', 'is_liked']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return getattr(obj, 'user_has_liked', False)
        return False

class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(source='user_id', read_only=True)
    likes_count = serializers.IntegerField(read_only=True, default=0)
    comments_count = serializers.IntegerField(read_only=True, default=0)
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ['id', 'user', 'book_id', 'rating', 'comment', 'is_spoiler', 'created_at', 'updated_at', 'likes_count', 'comments_count', 'is_liked']
        read_only_fields = ['id', 'book_id', 'created_at', 'updated_at']

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # We assume reactions are fetched with prefetch_related for performance, or we just do a simple query
            return getattr(obj, 'user_has_liked', False)
        return False

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(source='user_id', read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'user', 'echo_id', 'review_id', 'content', 'created_at']
        read_only_fields = ['id', 'echo_id', 'review_id', 'created_at']

class FriendshipSerializer(serializers.ModelSerializer):
    requester = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    requester_id = serializers.UUIDField(write_only=True, required=False)
    receiver_id = serializers.UUIDField(write_only=True, required=True)

    class Meta:
        model = Friendship
        fields = ['id', 'requester', 'receiver', 'requester_id', 'receiver_id', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']

class NotificationSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'message', 'sender', 'is_read', 'created_at', 'echo_id', 'review_id', 'friendship_id']


