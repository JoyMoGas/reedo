from django.urls import path
from .views import (
    SignInView, 
    SignUpView, 
    CheckUsernameView, 
    CheckEmailView,
    UpdateFavoriteGenresView,
    UpdateFavoriteAuthorsView,
    GenerateUsernameView,
    UserSuggestionsView
)

urlpatterns = [
    path('signin/', SignInView.as_view(), name='signin'),
    path('signup/', SignUpView.as_view(), name='signup'),
    path('check-username/', CheckUsernameView.as_view(), name='check-username'),
    path('check-email/', CheckEmailView.as_view(), name='check-email'),
    path('generate-username/', GenerateUsernameView.as_view(), name='generate-username'),
    path('profile/genres/', UpdateFavoriteGenresView.as_view(), name='update-genres'),
    path('profile/authors/', UpdateFavoriteAuthorsView.as_view(), name='update-authors'),
    path('suggestions/', UserSuggestionsView.as_view(), name='user-suggestions'),
]