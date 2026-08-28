from rest_framework import serializers
from .models import Books, Authors, Genres

class AuthorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Authors
        fields = ['id', 'name']

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genres
        fields = ['id', 'genre']

class BookSerializer(serializers.ModelSerializer):
    authors = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')
    genres = serializers.SlugRelatedField(many=True, read_only=True, slug_field='genre')

    class Meta:
        model = Books
        fields = ['id', 'title', 'cover_image', 'authors', 'genres', 'average_rating', 'synopsis', 'published_date', 'total_pages']

from users.serializers import UserSerializer
from .models import UserBook

class UserBookSerializer(serializers.ModelSerializer):
    book = BookSerializer(source='book_id', read_only=True)
    user = UserSerializer(source='user_id', read_only=True)

    class Meta:
        model = UserBook
        fields = ['id', 'user', 'book', 'status', 'current_page', 'progress_percentage', 'started_at', 'last_read_at']

