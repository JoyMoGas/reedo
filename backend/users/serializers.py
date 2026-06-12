# ===================================================================
# Imports
# ===================================================================

import random

from rest_framework import serializers

from django.contrib.auth import get_user_model

from django.apps import apps
from django.conf import settings

User = get_user_model()


# ===================================================================
# Serializers
# ===================================================================


class SignUpSerializer(serializers.ModelSerializer):
    """
    Serializes User model fields for signup process, handling passwords checks 
    and dynamic random selection for favorite genres and authors.
    """
    password_confirm = serializers.CharField(
        help_text="Confirm password for the user",
        write_only=True,
        style={'input_type': 'password'}
    )

    random_genres = serializers.BooleanField(
        default=False,
        required=False,
        write_only=True,
        help_text="Set to true if user wants system to select random genres"
    )

    random_authors = serializers.BooleanField(
        default=False,
        required=False,
        write_only=True,
        help_text="Set to true if user wants system to select random authors"
    )

    favorite_genres = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=apps.get_model('books', 'Genres').objects.all(),
        required=False
    )

    favorite_authors = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=apps.get_model('books', 'Authors').objects.all(),
        required=False
    )

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'password',
            'password_confirm',
            'full_name',
            'birth_date',
            'bio',
            'city_residence',
            'thumbnail',
            'favorite_genres',
            'favorite_authors',
            'random_genres',
            'random_authors'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True},
            'birth_date': {'required': True},
            'full_name': {'required': True},
        }

    def validate(self, data):
        """
        Global cross-field validations (passwords match, random assignment logic)
        """
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})

        GenreModel = apps.get_model('books', 'Genres')
        AuthorModel = apps.get_model('books', 'Authors')

        is_random_genres = data.get('random_genres', False)
        genres_provided = data.get('favorite_genres', [])

        if is_random_genres:
            all_genres = list(GenreModel.objects.all())
            if all_genres:
                data['favorite_genres'] = random.sample(all_genres, k=min(3, len(all_genres)))
            else:
                data['favorite_genres'] = []
        elif not genres_provided:
            raise serializers.ValidationError({"favorite_genres": "You must select your genres or activate the random option."})

        is_random_authors = data.get('random_authors', False)
        authors_provided = data.get('favorite_authors', [])

        if is_random_authors:
            all_authors = list(AuthorModel.objects.all())
            if all_authors:
                data['favorite_authors'] = random.sample(all_authors, k=min(4, len(all_authors)))
            else:
                data['favorite_authors'] = []

        return data

    def create(self, validated_data):
        """
        Creates a new user, ensures password hashing, and establishes ManyToMany relationships.
        """
        validated_data.pop('password_confirm', None)
        validated_data.pop('random_genres', None)
        validated_data.pop('random_authors', None)

        favorite_genres = validated_data.pop('favorite_genres', [])
        favorite_authors = validated_data.pop('favorite_authors', [])

        user = User.objects.create_user(**validated_data)

        if favorite_genres:
            user.favorite_genres.set(favorite_genres)
        if favorite_authors:
            user.favorite_authors.set(favorite_authors)

        return user


class UserSerializer(serializers.ModelSerializer):
    """
    Serializes comprehensive profile metrics and public info for user details.
    """
    thumbnail = serializers.SerializerMethodField()
    member_since_formatted = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'thumbnail',
            'bio',
            'city_residence',
            'honor_points',
            'show_spoilers',
            'member_since_formatted',
        ]
        read_only_fields = ['id', 'honor_points', 'member_since_formatted']

    def get_thumbnail(self, obj):
        if not obj.thumbnail:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return settings.MEDIA_URL + str(obj.thumbnail)

    def get_member_since_formatted(self, obj):
        if not obj.member_since:
            return None
        return obj.member_since.strftime('%B %Y')