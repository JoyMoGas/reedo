from rest_framework import serializers
from .models import Review, Comment, Reaction
from users.serializers import UserSerializer

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
        fields = ['id', 'user', 'review_id', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']
