"""
@project Reedo
@module views
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-05-21
"""
# ===================================================================
# Imports
# ===================================================================

from django.contrib.auth import authenticate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from books.models import Genres, Authors

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer, SignUpSerializer


# ===================================================================
# Views
# ===================================================================


def get_auth_for_user(user):
  rokens = RefreshToken.for_user(user)
  return {
    'user': UserSerializer(user).data,
    'tokens': {
      'refresh': str(rokens),
      'access': str(rokens.access_token),
    },
  }



class SignInView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if username:
      username = username.lower().strip()

    print("SignIn: ", username)

    if not username or not password:
      return Response({
        'error': 'Username and password are required',
      }, status=400)

    user = authenticate(username=username, password=password)

    if not user:
      return Response({
        'error': 'Invalid credentials',
      }, status=401)

    user_data = get_auth_for_user(user)

    return Response(user_data, status=200)

class SignUpView(APIView):
  permission_classes = [AllowAny]
  
  def post(self, request):
    print("SignUp: ", request.data)

    new_user = SignUpSerializer(data=request.data)
    new_user.is_valid(raise_exception=True)
    user = new_user.save()

    user_data = get_auth_for_user(user)

    return Response(user_data, status=201)

class CheckUsernameView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    username = request.data.get('username', '').strip().lower()
    
    if not username:
      return Response({'error': 'Username is required'}, status=400)
    
    exists = User.objects.filter(username__iexact=username).exists()
    return Response({'exists': exists}, status=200)

class CheckEmailView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    email = request.data.get('email', '').strip().lower()
    
    if not email:
      return Response({'error': 'Email is required'}, status=400)
    
    exists = User.objects.filter(email__iexact=email).exists()
    return Response({'exists': exists}, status=200)


class UpdateFavoriteGenresView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request):
    genres_list = request.data.get("genres", [])
    user = request.user
    
    # Validar que los géneros existan
    valid_genres = Genres.objects.filter(id__in=genres_list)
    user.favorite_genres.set(valid_genres)
    
    return Response({
      "message": "Favorite genres updated successfully",
      "favorite_genres": [{"id": g.id, "genre": g.genre} for g in user.favorite_genres.all()]
    }, status=200)


class UpdateFavoriteAuthorsView(APIView):
  permission_classes = [IsAuthenticated]

  def post(self, request):
    user = request.user
    author_ids = request.data.get("authors") # Para actualización en lote (onboarding)
    author_id = request.data.get("author_id") # Para seguir/desseguir individualmente
    action = request.data.get("action", "follow") # 'follow' o 'unfollow'

    if author_ids is not None:
      # Caso lote (onboarding)
      valid_authors = Authors.objects.filter(id__in=author_ids)
      user.favorite_authors.set(valid_authors)
      return Response({
        "message": "Favorite authors updated successfully",
        "favorite_authors": [{"id": a.id, "name": a.name} for a in user.favorite_authors.all()]
      }, status=200)

    if author_id:
      # Caso individual (seguir/desseguir)
      try:
        author = Authors.objects.get(id=author_id)
      except Authors.DoesNotExist:
        return Response({"error": "Author not found"}, status=404)

      if action == "follow":
        user.favorite_authors.add(author)
        message = f"Started following {author.name}"
      else:
        user.favorite_authors.remove(author)
        message = f"Stopped following {author.name}"

      return Response({
        "message": message,
        "favorite_authors": [{"id": a.id, "name": a.name} for a in user.favorite_authors.all()]
      }, status=200)

    return Response({"error": "Either 'authors' list or 'author_id' must be provided"}, status=400)


class GenerateUsernameView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    from django.contrib.auth import get_user_model
    import re
    import unicodedata

    User = get_user_model()
    fullname = request.data.get('fullname', '').strip()
    if not fullname:
      return Response({'username': ''}, status=200)

    # Normalize: remove accents
    normalized = unicodedata.normalize('NFKD', fullname).encode('ascii', 'ignore').decode('utf-8')
    # Replace non-alphanumeric with _
    base = re.sub(r'[^a-zA-Z0-9]+', '_', normalized).strip('_').lower()

    if not base:
      base = "user"

    username = base
    counter = 1
    while User.objects.filter(username__iexact=username).exists():
      username = f"{base}_{counter}"
      counter += 1

    return Response({'username': username}, status=200)


class UserSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from books.models import UserBook
        import random

        UserModel = get_user_model()
        current_user = request.user
        
        query = UserModel.objects.all()
        if current_user and current_user.is_authenticated:
            query = query.exclude(id=current_user.id)
        
        other_users = list(query[:30])
        
        if not other_users:
            return Response([], status=200)

        user_books = set()
        user_genres = set()
        user_city = ""
        
        if current_user and current_user.is_authenticated:
            user_books = set(UserBook.objects.filter(user_id=current_user).values_list('book_id', flat=True))
            user_genres = set(current_user.favorite_genres.values_list('genre', flat=True))
            user_city = current_user.city_residence.strip().lower() if current_user.city_residence else ""

        suggestions = []
        
        for ou in other_users:
            relation = "Fellow reader"
            score = 0
            
            ou_books = set(UserBook.objects.filter(user_id=ou).values_list('book_id', flat=True))
            common_books = user_books.intersection(ou_books)
            if common_books:
                cnt = len(common_books)
                relation = f"{cnt} book{'s' if cnt > 1 else ''} in common"
                score += cnt * 10
            else:
                ou_genres = set(ou.favorite_genres.values_list('genre', flat=True))
                common_genres = user_genres.intersection(ou_genres)
                if common_genres:
                    genre_name = list(common_genres)[0]
                    relation = f"also likes {genre_name}"
                    score += 5
                elif ou_genres:
                    genre_name = list(ou_genres)[0]
                    relation = f"likes {genre_name}"
                    score += 2
                
                if user_city and ou.city_residence and ou.city_residence.strip().lower() == user_city:
                    relation = f"same city ({ou.city_residence})"
                    score += 4

            avatar_url = None
            if ou.thumbnail:
                avatar_url = request.build_absolute_uri(ou.thumbnail.url)

            suggestions.append({
                "id": str(ou.id),
                "fullName": ou.full_name or ou.username,
                "username": ou.username,
                "avatar": avatar_url,
                "relation": relation,
                "score": score
            })
            
        suggestions.sort(key=lambda x: x["score"], reverse=True)
        
        return Response(suggestions[:10], status=200)
