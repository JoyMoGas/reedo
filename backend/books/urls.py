from django.urls import path
from .views import (
    FetchOrCreateBookView, 
    BookSearchView,
    GenreListView,
    AuthorSuggestionsView,
    AuthorSearchView,
    BookSuggestionsView,
    UserBookSaveView,
    DiscoverBooksView
)

urlpatterns = [
    path('search-or-create/', FetchOrCreateBookView.as_view(), name='fetch-or-create-book'),
    path('search/', BookSearchView.as_view(), name='book-search'),
    path('genres/', GenreListView.as_view(), name='genre-list'),
    path('authors/suggestions/', AuthorSuggestionsView.as_view(), name='author-suggestions'),
    path('authors/search/', AuthorSearchView.as_view(), name='author-search'),
    path('suggestions/', BookSuggestionsView.as_view(), name='book-suggestions'),
    path('userbook/', UserBookSaveView.as_view(), name='userbook-save'),
    path('discover/', DiscoverBooksView.as_view(), name='discover-books'),
]
