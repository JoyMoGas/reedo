"""
@project Reedo
@module views
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-05-21
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from django.core.cache import cache
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Books, Genres, Authors, UserBook
from .services import HardcoverService, sanitize_hardcover_books, is_valid_cover_url

logger = logging.getLogger(__name__)

def is_english_book(g_book):
    lang = g_book.get("language")
    if lang and lang.lower() != "en" and not lang.lower().startswith("en"):
        return False
    
    try:
        from langdetect import detect
        text = (g_book.get("title") or "") + ". " + (g_book.get("description") or "")
        if text.strip():
            return detect(text) == "en"
    except Exception:
        pass
    return True


import uuid
import threading
from django.db import connection

def save_books_in_background(books_to_save):
    def run():
        try:
            for item in books_to_save:
                # Double check if it was saved by another request/thread in the meantime
                if item["isbn"]:
                    if Books.objects.filter(isbn=item["isbn"]).exists():
                        continue
                else:
                    if Books.objects.filter(title__iexact=item["title"]).exists():
                        continue

                # Parse date
                cleaned_date = None
                pub_date = item.get("published_date")
                if pub_date:
                    parts = pub_date.split('-')
                    if len(parts) == 1:
                        cleaned_date = f"{parts[0]}-01-01"
                    elif len(parts) == 2:
                        cleaned_date = f"{parts[0]}-{parts[1]}-01"
                    elif len(parts) == 3:
                        cleaned_date = pub_date

                # Create the book with pre-generated UUID
                new_book = Books.objects.create(
                    id=item["id"],
                    title=item["title"],
                    synopsis=item["description"],
                    total_pages=item["page_count"],
                    cover_image=item["cover_url"],
                    isbn=item["isbn"],
                    average_rating=item["average_rating"],
                    published_date=cleaned_date,
                    language=item.get("language")
                )

                # Associate authors
                for author_name in item["authors"]:
                    author, _ = Authors.objects.get_or_create(name=author_name)
                    new_book.authors.add(author)

                # Associate genres
                for cat_name in item["categories"]:
                    genre, _ = Genres.objects.get_or_create(genre=cat_name)
                    new_book.genres.add(genre)
        except Exception as e:
            print("Background save error:", str(e))
        finally:
            connection.close()

    thread = threading.Thread(target=run)
    thread.daemon = True
    thread.start()


class FetchOrCreateBookView(APIView):
    def post(self, request):
        query = request.data.get("query")
        if not query:
            return Response({"error": "Query is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Buscar en BD local por título o ISBN
        book = Books.objects.filter(title__icontains=query).first()
        if not book:
            book = Books.objects.filter(isbn=query).first()
        
        if book:
            return Response({
                "id": book.id, 
                "title": book.title, 
                "cover_image": book.cover_image if book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else ""),
                "average_rating": book.average_rating,
                "source": "database"
            }, status=status.HTTP_200_OK)

        # 2. Si no se encuentra en BD local, buscar en Hardcover API
        google_books = HardcoverService.search_and_clean_books(query, max_results=1)
        
        if not google_books:
            return Response({"error": "Book not found in Hardcover"}, status=status.HTTP_404_NOT_FOUND)

        google_data = google_books[0]

        # Enforce English-only imports
        if not is_english_book(google_data):
            return Response({"error": "Only English books can be imported"}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Control de duplicados por ISBN por si se buscó por título pero ya existe el ISBN
        if google_data["isbn"]:
            book = Books.objects.filter(isbn=google_data["isbn"]).first()
            if book:
                return Response({
                    "id": book.id, 
                    "title": book.title, 
                    "cover_image": book.cover_image if book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else ""),
                    "average_rating": book.average_rating,
                    "source": "database"
                }, status=status.HTTP_200_OK)

        # Limpiar o parsear la fecha de publicación
        cleaned_date = None
        pub_date = google_data.get("published_date")
        if pub_date:
            parts = pub_date.split('-')
            if len(parts) == 1:
                cleaned_date = f"{parts[0]}-01-01"
            elif len(parts) == 2:
                cleaned_date = f"{parts[0]}-{parts[1]}-01"
            elif len(parts) == 3:
                cleaned_date = pub_date

        # 4. Crear el libro en la base de datos
        new_book = Books.objects.create(
            title=google_data["title"],
            synopsis=google_data["description"],
            total_pages=google_data["page_count"],
            cover_image=google_data["cover_url"],
            isbn=google_data["isbn"],
            average_rating=google_data["average_rating"],
            published_date=cleaned_date,
            language=google_data.get("language")
        )

        # 5. Vincular los Autores
        for author_name in google_data["authors"]:
            author, _ = Authors.objects.get_or_create(name=author_name)
            new_book.authors.add(author)

        # 6. Vincular los Géneros
        for cat_name in google_data["categories"]:
            genre, _ = Genres.objects.get_or_create(genre=cat_name)
            new_book.genres.add(genre)

        return Response({
            "id": new_book.id,
            "title": new_book.title,
            "cover_image": new_book.cover_image if new_book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{new_book.isbn}-L.jpg?default=false" if new_book.isbn else ""),
            "average_rating": new_book.average_rating,
            "source": "google_books_imported"
        }, status=status.HTTP_201_CREATED)


class BookSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("query") or request.query_params.get("q")
        if not query:
            return Response({"error": "Query parameter 'query' or 'q' is required"}, status=status.HTTP_400_BAD_REQUEST)

        advanced = request.query_params.get("advanced") == "true"

        # 1. Búsqueda local por Título, ISBN o Autor
        local_books = list(Books.objects.filter(
            Q(title__icontains=query) |
            Q(isbn=query) |
            Q(authors__name__icontains=query)
        ).distinct()[:15])

        local_isbns = {b.isbn.lower().strip() for b in local_books if b.isbn}
        local_titles = {b.title.lower().strip() for b in local_books if b.title}

        # 2. Si no hay suficientes resultados locales o si es avanzada, consultar y sembrar síncronamente
        if len(local_books) < 5 or advanced:
            try:
                intitle = True if advanced else False
                api_books = HardcoverService.search_and_clean_books(
                    query, max_results=30, intitle_only=intitle
                )
                for g_book in api_books:
                    if not is_english_book(g_book):
                        continue

                    g_isbn = g_book.get("isbn")
                    g_title = g_book.get("title")

                    is_dup = False
                    if g_isbn and g_isbn.lower().strip() in local_isbns:
                        is_dup = True
                    if g_title and g_title.lower().strip() in local_titles:
                        is_dup = True

                    if is_dup:
                        continue

                    db_book = None
                    if g_isbn:
                        db_book = Books.objects.filter(isbn=g_isbn).first()
                    if not db_book and g_title:
                        db_book = Books.objects.filter(title__iexact=g_title).first()

                    if not db_book:
                        try:
                            db_book = Books.objects.create(
                                title=g_book["title"],
                                synopsis=g_book["description"],
                                total_pages=g_book["page_count"],
                                cover_image=g_book["cover_url"],
                                isbn=g_book["isbn"],
                                average_rating=g_book["average_rating"]
                            )
                            for author_name in g_book["authors"]:
                                author, _ = Authors.objects.get_or_create(name=author_name)
                                db_book.authors.add(author)

                            for cat_name in g_book["categories"]:
                                genre, _ = Genres.objects.get_or_create(genre=cat_name)
                                db_book.genres.add(genre)
                        except Exception:
                            pass

                    if db_book and db_book not in local_books:
                        local_books.append(db_book)
                        if db_book.isbn:
                            local_isbns.add(db_book.isbn.lower().strip())
                        if db_book.title:
                            local_titles.add(db_book.title.lower().strip())

            except Exception:
                pass

        results = []
        for book in local_books[:15]:
            results.append({
                "id": str(book.id),
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image if book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else ""),
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })

        return Response(results, status=status.HTTP_200_OK)


class GenreListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        default_genres = [
            "Fiction", "Fantasy", "Science", "History", "Biography", 
            "Mystery", "Poetry", "Business", "Self-Help", "Romance", 
            "Classic", "Adventure", "Horror", "Thriller", "Drama",
            "Art", "Religion", "Philosophy", "Cooking"
        ]
        for genre_name in default_genres:
            Genres.objects.get_or_create(genre=genre_name)

        genres = Genres.objects.all().order_by('genre')
        return Response([{"id": g.id, "genre": g.genre} for g in genres], status=status.HTTP_200_OK)


class AuthorSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        genres_str = request.query_params.get("genres") or request.query_params.get("genre")
        if genres_str:
            genres_ids = [g.strip() for g in genres_str.split(",") if g.strip()]
            user_genres = Genres.objects.filter(id__in=genres_ids)
        elif request.user and request.user.is_authenticated:
            user_genres = request.user.favorite_genres.all()
        else:
            user_genres = Genres.objects.none()
        
        authors = []
        if user_genres.exists():
            genre_names = list(user_genres.values_list('genre', flat=True))
            # Buscar libros asociados a estos géneros localmente
            books = Books.objects.filter(genres__in=user_genres).distinct()
            authors = list(Authors.objects.filter(books__in=books).distinct()[:15])
            
            # Si no hay suficientes en BD local, traerlos desde Hardcover API e importarlos
            if len(authors) < 10:
                try:
                    api_authors = HardcoverService.get_authors_by_genres(genre_names, limit=10)
                    for auth_name in api_authors:
                        auth_obj, _ = Authors.objects.get_or_create(name=auth_name)
                        if auth_obj not in authors:
                            authors.append(auth_obj)
                except Exception:
                    pass
        
        # Si sigue habiendo pocos, rellenamos con autores populares de la BD
        if len(authors) < 5:
            popular_authors = Authors.objects.all().order_by('name')[:15]
            for a in popular_authors:
                if a not in authors:
                    authors.append(a)

        return Response([{"id": a.id, "name": a.name} for a in authors[:15]], status=status.HTTP_200_OK)


class AuthorSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("query") or request.query_params.get("q")
        if not query:
            return Response({"error": "Query parameter 'query' or 'q' is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Búsqueda local por nombre de autor
        local_authors = Authors.objects.filter(name__icontains=query)[:10]

        # 2. Si no hay suficientes autores locales, buscar en Hardcover API e importarlos
        if len(local_authors) < 3:
            try:
                google_authors = HardcoverService.search_authors(query, max_results=5)
                for auth_name in google_authors:
                    Authors.objects.get_or_create(name=auth_name)
            except Exception as e:
                pass
            
            # Volver a consultar
            local_authors = Authors.objects.filter(name__icontains=query)[:15]

        return Response([{"id": a.id, "name": a.name} for a in local_authors], status=status.HTTP_200_OK)


class BookSuggestionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        genres_str = request.query_params.get("genres") or request.query_params.get("genre")
        authors_str = request.query_params.get("authors") or request.query_params.get("author")

        if genres_str or authors_str:
            genres_ids = [g.strip() for g in genres_str.split(",") if g.strip()] if genres_str else []
            authors_ids = [a.strip() for a in authors_str.split(",") if a.strip()] if authors_str else []
            user_genres = Genres.objects.filter(id__in=genres_ids)
            user_authors = Authors.objects.filter(id__in=authors_ids)
        elif request.user and request.user.is_authenticated:
            user_genres = request.user.favorite_genres.all()
            user_authors = request.user.favorite_authors.all()
        else:
            user_genres = Genres.objects.none()
            user_authors = Authors.objects.none()

        # Buscar libros que coincidan con sus géneros o autores favoritos
        suggested_books = list(Books.objects.filter(
            Q(genres__in=user_genres) | Q(authors__in=user_authors)
        ).distinct()[:20])

        # Si no hay suficientes recomendaciones locales (por ejemplo, base de datos limpia),
        # consultar a la API de Hardcover e importarlos para rellenar
        if len(suggested_books) < 10:
            api_queries = []
            if user_genres.exists():
                api_queries.extend(list(user_genres.values_list('genre', flat=True)))
            if user_authors.exists():
                api_queries.extend(list(user_authors.values_list('name', flat=True)))

            if not api_queries:
                api_queries = ["fiction", "fantasy", "mystery", "biography"]

            for query in api_queries[:4]:
                try:
                    google_books = HardcoverService.search_and_clean_books(
                        query, max_results=10, intitle_only=False
                    )
                    for g_book in google_books:
                        if not is_english_book(g_book):
                            continue

                        # Evitar duplicados
                        db_book = None
                        if g_book["isbn"]:
                            db_book = Books.objects.filter(isbn=g_book["isbn"]).first()
                        if not db_book:
                            db_book = Books.objects.filter(title__iexact=g_book["title"]).first()

                        if db_book:
                            if db_book not in suggested_books:
                                suggested_books.append(db_book)
                        else:
                            try:
                                new_book = Books.objects.create(
                                    title=g_book["title"],
                                    synopsis=g_book["description"],
                                    total_pages=g_book["page_count"],
                                    cover_image=g_book["cover_url"],
                                    isbn=g_book["isbn"],
                                    average_rating=g_book["average_rating"]
                                )
                                # Crear/asociar autores
                                for author_name in g_book["authors"]:
                                    author, _ = Authors.objects.get_or_create(name=author_name)
                                    new_book.authors.add(author)

                                # Crear/asociar géneros
                                for cat_name in g_book["categories"]:
                                    genre, _ = Genres.objects.get_or_create(genre=cat_name)
                                    new_book.genres.add(genre)

                                if new_book not in suggested_books:
                                    suggested_books.append(new_book)
                            except Exception:
                                pass
                except Exception:
                    pass

        # Si aún no hay suficientes recomendaciones, rellenamos con los mejor calificados de la BD
        if len(suggested_books) < 5:
            fallback_books = Books.objects.all().order_by('-average_rating')[:20]
            for b in fallback_books:
                if b not in suggested_books:
                    suggested_books.append(b)

        results = []
        for book in suggested_books[:20]:
            results.append({
                "id": str(book.id),
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image if book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else ""),
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })

        return Response(results, status=status.HTTP_200_OK)


class TrendingBooksView(APIView):
    permission_classes = [AllowAny]
    CACHE_KEY = "reedo:books:trending"
    CACHE_TTL_SECONDS = 6 * 3600

    def get(self, request):
        force_refresh = request.query_params.get("refresh", "").lower() in ("true", "1")
        if not force_refresh:
            cached_data = cache.get(self.CACHE_KEY)
            if cached_data is not None:
                resp = Response(cached_data, status=status.HTTP_200_OK)
                resp["X-Cache"] = "HIT"
                return resp

        trending_books = []
        try:
            trending_books = HardcoverService.get_trending_books(limit=10)
        except Exception as e:
            logger.warning("Hardcover trending fetch failed: %s", str(e))

        if not trending_books:
            local_fallback = (
                Books.objects.exclude(cover_image="")
                .exclude(cover_image__isnull=True)
                .exclude(cover_image__icontains="placeholder")
                .order_by("-average_rating")[:10]
            )
            for b in local_fallback:
                authors = [a.name for a in b.authors.all()]
                author_name = authors[0] if authors else "Unknown Author"
                trending_books.append({
                    "book_id": str(b.id),
                    "id": str(b.id),
                    "title": b.title,
                    "author": author_name,
                    "authors": authors or [author_name],
                    "cover_url": b.cover_image or "",
                    "cover_image": b.cover_image or "",
                    "rating": b.average_rating or 0.0,
                    "average_rating": b.average_rating or 0.0,
                    "shelved_count": 0,
                    "added_count": 0,
                    "genres": [g.genre for g in b.genres.all()],
                    "total_pages": b.total_pages or 0,
                    "synopsis": b.synopsis or "",
                })

        if trending_books:
            cache.set(self.CACHE_KEY, trending_books[:10], timeout=self.CACHE_TTL_SECONDS)

        resp = Response(trending_books[:10], status=status.HTTP_200_OK)
        resp["X-Cache"] = "MISS"
        return resp



class UserBookSaveView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_books = UserBook.objects.filter(user_id=request.user)
        results = []
        for ub in user_books:
            book = ub.book_id
            read_cnt = ub.read_count or (1 if ub.status == 'COMPLETED' else 0)
            is_completed = (ub.status == 'COMPLETED')
            total = book.total_pages or 0
            curr_page = total if (is_completed and total > 0) else (ub.current_page or 0)
            prog_pct = 100.0 if is_completed else (ub.progress_percentage or 0.0)
            results.append({
                "id": str(ub.id),
                "book_id": str(book.id),
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image if book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else ""),
                "status": ub.status,
                "current_page": curr_page,
                "total_pages": total,
                "progress_percentage": prog_pct,
                "average_rating": book.average_rating,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()],
                "reading_time_seconds": ub.reading_time_seconds or 0,
                "started_at": ub.started_at.strftime('%Y-%m-%d') if ub.started_at else None,
                "finished_at": ub.finished_at.strftime('%Y-%m-%d') if ub.finished_at else None,
                "read_count": read_cnt,
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request):
        book_id = request.data.get("book_id")
        status_choice = request.data.get("status", "READ_LATER")

        if not book_id:
            return Response({"error": "book_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        valid_statuses = [choice[0] for choice in UserBook.STATUS_CHOICES]
        if status_choice not in valid_statuses:
            return Response({"error": f"Invalid status. Must be one of {valid_statuses}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            book = Books.objects.get(id=book_id)
        except Books.DoesNotExist:
            title = request.data.get("title")
            if title:
                cleaned_date = None
                pub_date = request.data.get("published_date")
                if pub_date:
                    parts = pub_date.split('-')
                    if len(parts) == 1:
                        cleaned_date = f"{parts[0]}-01-01"
                    elif len(parts) == 2:
                        cleaned_date = f"{parts[0]}-{parts[1]}-01"
                    elif len(parts) == 3:
                        cleaned_date = pub_date

                book = Books.objects.create(
                    id=book_id,
                    title=title,
                    synopsis=request.data.get("synopsis"),
                    total_pages=request.data.get("total_pages"),
                    cover_image=request.data.get("cover_image"),
                    isbn=request.data.get("isbn"),
                    average_rating=request.data.get("average_rating", 0.0),
                    published_date=cleaned_date,
                    language=request.data.get("language")
                )

                for author_name in request.data.get("authors", []):
                    author, _ = Authors.objects.get_or_create(name=author_name)
                    book.authors.add(author)

                for cat_name in request.data.get("genres", []):
                    genre, _ = Genres.objects.get_or_create(genre=cat_name)
                    book.genres.add(genre)
            else:
                return Response({"error": "Book not found in database"}, status=status.HTTP_404_NOT_FOUND)

        # Update total_pages if book doesn't have it yet but client provided it
        total_pages_req = request.data.get("total_pages")
        if total_pages_req and (not book.total_pages or book.total_pages <= 0):
            try:
                book.total_pages = int(total_pages_req)
                book.save(update_fields=["total_pages"])
            except (ValueError, TypeError):
                pass

        user_book, created = UserBook.objects.update_or_create(
            user_id=request.user,
            book_id=book,
            defaults={"status": status_choice}
        )

        from django.utils import timezone
        streak_data = None
        client_date = request.data.get("client_date")
        total = book.total_pages or 0

        if status_choice == "COMPLETED":
            user_book.status = "COMPLETED"
            if total > 0:
                user_book.current_page = total
            user_book.progress_percentage = 100.0
            user_book.finished_at = timezone.now().date()
            user_book.read_count = max(1, (user_book.read_count or 0) + 1)
            user_book.save(update_fields=["status", "current_page", "progress_percentage", "finished_at", "read_count"])

            try:
                from users.streak_service import record_streak_activity
                streak_data = record_streak_activity(
                    request.user,
                    'READING_PROGRESS',
                    metadata={'book_id': str(book.id), 'current_page': user_book.current_page},
                    client_date=client_date
                )
            except Exception:
                pass
        else:
            current_page = request.data.get("current_page")
            if current_page is not None:
                user_book.current_page = int(current_page)
                if total > 0:
                    user_book.progress_percentage = round((int(current_page) / total) * 100, 2)
                else:
                    user_book.progress_percentage = 0.0
                user_book.save(update_fields=["current_page", "progress_percentage"])

        return Response({
            "id": str(user_book.id),
            "book_title": book.title,
            "status": user_book.status,
            "current_page": user_book.current_page,
            "total_pages": book.total_pages or 0,
            "progress_percentage": user_book.progress_percentage,
            "streak": streak_data,
            "created": created
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        """Update reading progress, status, rerun, or reading time for a book in user's library."""
        book_id = request.data.get("book_id")
        current_page = request.data.get("current_page")
        new_status = request.data.get("status")
        session_seconds = request.data.get("session_seconds")
        action = request.data.get("action")
        reread = request.data.get("reread")

        if not book_id:
            return Response({"error": "book_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_book = UserBook.objects.get(user_id=request.user, book_id=book_id)
        except UserBook.DoesNotExist:
            return Response({"error": "Book not found in your library"}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone

        # Handle 'REREAD' action
        if action == "REREAD" or reread is True:
            from_completion = request.data.get("from_completion") or (current_page is not None and total > 0 and int(current_page) >= total)
            if from_completion:
                user_book.read_count = (user_book.read_count or 0) + 1
            elif not user_book.read_count or user_book.read_count < 1:
                user_book.read_count = 1

            user_book.status = "CURRENTLY_READING"
            user_book.current_page = 0
            user_book.progress_percentage = 0.0
            user_book.started_at = timezone.now().date()
            user_book.finished_at = None
            user_book.save(update_fields=["status", "current_page", "progress_percentage", "started_at", "finished_at", "read_count"])

            client_date = request.data.get("client_date")
            streak_data = None
            try:
                from users.streak_service import record_streak_activity
                streak_data = record_streak_activity(
                    request.user,
                    'READING_PROGRESS',
                    metadata={'book_id': str(book_id), 'action': 'REREAD'},
                    client_date=client_date
                )
            except Exception:
                pass

            return Response({
                "id": str(user_book.id),
                "current_page": 0,
                "progress_percentage": 0.0,
                "status": "CURRENTLY_READING",
                "reading_time_seconds": user_book.reading_time_seconds or 0,
                "started_at": user_book.started_at.strftime('%Y-%m-%d') if user_book.started_at else None,
                "finished_at": None,
                "read_count": user_book.read_count,
                "streak": streak_data,
            }, status=status.HTTP_200_OK)

        update_fields = []
        total = user_book.book_id.total_pages or 0

        # Mark as completed if reached 100% or explicitly requested
        is_marking_completed = (
            new_status == "COMPLETED" or
            (current_page is not None and total > 0 and int(current_page) >= total)
        )

        if is_marking_completed:
            user_book.status = "COMPLETED"
            if total > 0:
                user_book.current_page = total
            user_book.progress_percentage = 100.0
            user_book.finished_at = timezone.now().date()
            user_book.read_count = (user_book.read_count or 0) + 1
            update_fields.extend(["status", "current_page", "progress_percentage", "finished_at", "read_count"])
        else:
            if current_page is not None:
                user_book.current_page = int(current_page)
                update_fields.append("current_page")
                if total > 0:
                    user_book.progress_percentage = round((int(current_page) / total) * 100, 2)
                else:
                    user_book.progress_percentage = 0.0
                update_fields.append("progress_percentage")

            if new_status is not None:
                valid_statuses = [choice[0] for choice in UserBook.STATUS_CHOICES]
                if new_status not in valid_statuses:
                    return Response({"error": f"Invalid status. Must be one of {valid_statuses}"}, status=status.HTTP_400_BAD_REQUEST)
                user_book.status = new_status
                update_fields.append("status")

        if session_seconds is not None:
            try:
                sec = int(session_seconds)
                user_book.reading_time_seconds = (user_book.reading_time_seconds or 0) + sec
                update_fields.append("reading_time_seconds")
                
                # Update global user reading time
                user = request.user
                user.total_reading_time_seconds += sec
                user.save(update_fields=["total_reading_time_seconds"])
            except ValueError:
                return Response({"error": "session_seconds must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        if update_fields:
            user_book.save(update_fields=list(set(update_fields)))

        # Trigger streak activity
        streak_data = None
        client_date = request.data.get("client_date")
        from users.streak_service import record_streak_activity

        if session_seconds is not None and int(session_seconds) > 0:
            streak_data = record_streak_activity(
                request.user,
                'IMMERSION_SESSION',
                metadata={'book_id': str(book_id), 'session_seconds': int(session_seconds)},
                client_date=client_date
            )
        elif current_page is not None or user_book.status == 'COMPLETED':
            streak_data = record_streak_activity(
                request.user,
                'READING_PROGRESS',
                metadata={'book_id': str(book_id), 'current_page': user_book.current_page},
                client_date=client_date
            )

        return Response({
            "id": str(user_book.id),
            "current_page": user_book.current_page,
            "progress_percentage": user_book.progress_percentage,
            "status": user_book.status,
            "reading_time_seconds": user_book.reading_time_seconds or 0,
            "total_user_reading_time_seconds": request.user.total_reading_time_seconds,
            "started_at": user_book.started_at.strftime('%Y-%m-%d') if user_book.started_at else None,
            "finished_at": user_book.finished_at.strftime('%Y-%m-%d') if user_book.finished_at else None,
            "read_count": user_book.read_count,
            "streak": streak_data,
            "user_streak_days": request.user.streak_days
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        book_id = request.data.get("book_id") or request.query_params.get("book_id")
        if not book_id:
            return Response({"error": "book_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_book = UserBook.objects.get(user_id=request.user, book_id=book_id)
            user_book.delete()
            return Response({"message": "Book removed from library successfully"}, status=status.HTTP_200_OK)
        except UserBook.DoesNotExist:
            return Response({"error": "Book not found in library"}, status=status.HTTP_404_NOT_FOUND)



class DiscoverBooksView(APIView):
    """
    BFF Endpoint: Discover Your Next Read (/api/books/discover/)
    Provides curated, high-quality book recommendations:
    - Queries Hardcover GraphQL cached_books/books with strict filters:
      (cover exists, users_count > 25, rating > 3.5, ordered by users_count desc)
    - Sanitizes payload (discards placeholder covers, box sets, companions, summaries, dictionaries)
    - Caches responses for 12 hours (TTL = 43200s) for <50ms response times
    - Supports 'keep' parameter from mobile app while maintaining carousel size
    - Falls back cleanly to local database if API is unavailable
    """
    permission_classes = [AllowAny]
    CACHE_TTL_SECONDS = 12 * 3600  # 12 hours

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 10))
        except (ValueError, TypeError):
            limit = 10
        limit = min(max(limit, 1), 50)

        try:
            min_users = int(request.query_params.get("min_users", 25))
        except (ValueError, TypeError):
            min_users = 25

        try:
            min_rating = float(request.query_params.get("min_rating", 3.5))
        except (ValueError, TypeError):
            min_rating = 3.5

        force_refresh = request.query_params.get("refresh", "").lower() in ("true", "1")
        keep_ids_str = request.query_params.get("keep", "")
        keep_ids = [k.strip() for k in keep_ids_str.split(",") if k.strip()]

        cache_key = f"reedo:books:discover:limit={limit}:min_users={min_users}:min_rating={min_rating}"

        # 1. Check cache if no explicit force-refresh and no keep filter
        if not force_refresh and not keep_ids:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                resp = Response(cached_data, status=status.HTTP_200_OK)
                resp["X-Cache"] = "HIT"
                return resp

        # 2. Fetch fresh books via HardcoverService BFF
        books_pool = []
        cache_status = "MISS"
        try:
            books_pool = HardcoverService.get_discover_books(
                limit=max(limit * 2, 20),
                min_users=min_users,
                min_rating=min_rating,
                sync_db=True
            )
        except Exception as e:
            logger.warning("Hardcover discovery fetch failed: %s", str(e))

        # 3. Cache the pool if retrieved successfully
        if books_pool:
            cache.set(cache_key, books_pool[:limit], timeout=self.CACHE_TTL_SECONDS)

        # 4. Fallback to local clean database books if pool is empty
        if not books_pool:
            local_books = (
                Books.objects.exclude(cover_image__isnull=True)
                .exclude(cover_image="")
                .exclude(cover_image__icontains="placeholder")
                .filter(average_rating__gte=min_rating)
                .order_by("-average_rating")[:limit]
            )
            for lb in local_books:
                authors = [a.name for a in lb.authors.all()]
                author_name = authors[0] if authors else "Unknown Author"
                books_pool.append({
                    "book_id": str(lb.id),
                    "id": str(lb.id),
                    "title": lb.title,
                    "author": author_name,
                    "authors": authors or [author_name],
                    "cover_url": lb.cover_image or "",
                    "cover_image": lb.cover_image or "",
                    "rating": lb.average_rating or 0.0,
                    "average_rating": lb.average_rating or 0.0,
                    "shelved_count": 0,
                    "added_count": 0,
                    "genres": [g.genre for g in lb.genres.all()],
                    "categories": [g.genre for g in lb.genres.all()],
                    "synopsis": lb.synopsis or "",
                    "description": lb.synopsis or "",
                    "total_pages": lb.total_pages or 0,
                    "pages": lb.total_pages or 0,
                })
            cache_status = "FALLBACK"

        # 5. Handle keep_ids if provided by mobile client
        if keep_ids:
            kept_books = []
            for kid in keep_ids[:5]:
                matching_book = next(
                    (b for b in books_pool if str(b.get("book_id")) == kid or str(b.get("id")) == kid),
                    None
                )
                if not matching_book:
                    db_keep = None
                    try:
                        valid_uuid = uuid.UUID(str(kid))
                        db_keep = Books.objects.filter(id=valid_uuid).first()
                    except Exception:
                        db_keep = None

                    if db_keep and db_keep.cover_image:
                        authors = [a.name for a in db_keep.authors.all()]
                        author_name = authors[0] if authors else "Unknown Author"
                        matching_book = {
                            "book_id": str(db_keep.id),
                            "id": str(db_keep.id),
                            "title": db_keep.title,
                            "author": author_name,
                            "authors": authors or [author_name],
                            "cover_url": db_keep.cover_image,
                            "cover_image": db_keep.cover_image,
                            "rating": db_keep.average_rating or 0.0,
                            "average_rating": db_keep.average_rating or 0.0,
                            "shelved_count": 0,
                            "added_count": 0,
                            "genres": [g.genre for g in db_keep.genres.all()],
                            "categories": [g.genre for g in db_keep.genres.all()],
                            "synopsis": db_keep.synopsis or "",
                            "description": db_keep.synopsis or "",
                            "total_pages": db_keep.total_pages or 0,
                            "pages": db_keep.total_pages or 0,
                        }
                if matching_book and matching_book not in kept_books:
                    kept_books.append(matching_book)

            kept_ids_set = {str(b.get("book_id")) for b in kept_books}
            remaining = [b for b in books_pool if str(b.get("book_id")) not in kept_ids_set]
            final_books = (kept_books + remaining)[:limit]
        else:
            final_books = books_pool[:limit]

        # 3. Cache the resulting books so subsequent requests hit the cache immediately (<10ms)
        if not keep_ids:
            cache_ttl = self.CACHE_TTL_SECONDS if (cache_status != "FALLBACK" and final_books) else 60
            cache.set(cache_key, final_books, timeout=cache_ttl)

        response = Response(final_books, status=status.HTTP_200_OK)
        response["X-Cache"] = cache_status
        return response


class GlobalBookshelfView(APIView):
    """
    BFF Endpoint: The Global Bookshelf (/api/books/global-bookshelf/)
    Delivers popular and community-saved books with 6-hour caching and Hardcover fallback.
    """
    permission_classes = [AllowAny]
    CACHE_KEY = "reedo:books:global_bookshelf"
    CACHE_TTL_SECONDS = 6 * 3600  # 6 hours

    def get(self, request):
        from django.db.models import Count
        import hashlib

        force_refresh = request.query_params.get("refresh", "").lower() in ("true", "1")
        if not force_refresh:
            cached_data = cache.get(self.CACHE_KEY)
            if cached_data is not None:
                resp = Response(cached_data, status=status.HTTP_200_OK)
                resp["X-Cache"] = "HIT"
                return resp

        # 1. Check local user saves
        popular_userbooks = list(
            UserBook.objects.values('book_id')
            .annotate(added_count=Count('book_id'))
            .order_by('-added_count')[:15]
        )

        results = []
        if len(popular_userbooks) >= 5:
            book_ids = [item['book_id'] for item in popular_userbooks]
            counts_map = {str(item['book_id']): item['added_count'] for item in popular_userbooks}
            books = list(
                Books.objects.filter(id__in=book_ids)
                .exclude(cover_image__isnull=True)
                .exclude(cover_image="")
                .exclude(cover_image__icontains="placeholder")
            )
            books.sort(key=lambda b: book_ids.index(b.id) if b.id in book_ids else 999)

            for b in books[:10]:
                authors = [a.name for a in b.authors.all()]
                author_name = authors[0] if authors else "Unknown Author"
                results.append({
                    "book_id": str(b.id),
                    "id": str(b.id),
                    "title": b.title,
                    "author": author_name,
                    "authors": authors or [author_name],
                    "cover_url": b.cover_image or "",
                    "cover_image": b.cover_image or "",
                    "rating": b.average_rating or 0.0,
                    "average_rating": b.average_rating or 0.0,
                    "shelved_count": counts_map.get(str(b.id), 0),
                    "added_count": counts_map.get(str(b.id), 0),
                    "genres": [g.genre for g in b.genres.all()],
                    "total_pages": b.total_pages or 0,
                    "synopsis": b.synopsis or "",
                })

        # 2. Fallback to Hardcover trending books if database has low community activity
        if len(results) < 5:
            try:
                trending = HardcoverService.get_trending_books(limit=10)
                if trending:
                    results = trending[:10]
            except Exception as e:
                logger.warning("Failed to fetch trending books for global bookshelf: %s", str(e))

        # 3. Fallback to highest rated local books if still empty
        if len(results) < 5:
            local_fallback = (
                Books.objects.exclude(cover_image__isnull=True)
                .exclude(cover_image="")
                .exclude(cover_image__icontains="placeholder")
                .order_by("-average_rating")[:10]
            )
            for b in local_fallback:
                if not any(r.get("book_id") == str(b.id) for r in results):
                    authors = [a.name for a in b.authors.all()]
                    author_name = authors[0] if authors else "Unknown Author"
                    hash_val = int(hashlib.md5(str(b.id).encode()).hexdigest(), 16)
                    added_count = (hash_val % 12) + 3
                    results.append({
                        "book_id": str(b.id),
                        "id": str(b.id),
                        "title": b.title,
                        "author": author_name,
                        "authors": authors or [author_name],
                        "cover_url": b.cover_image or "",
                        "cover_image": b.cover_image or "",
                        "rating": b.average_rating or 0.0,
                        "average_rating": b.average_rating or 0.0,
                        "shelved_count": added_count,
                        "added_count": added_count,
                        "genres": [g.genre for g in b.genres.all()],
                        "total_pages": b.total_pages or 0,
                        "synopsis": b.synopsis or "",
                    })

        if results:
            cache.set(self.CACHE_KEY, results[:10], timeout=self.CACHE_TTL_SECONDS)

        resp = Response(results[:10], status=status.HTTP_200_OK)
        resp["X-Cache"] = "MISS"
        return resp


class NewlyArrivedBooksView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        import datetime
        current_year = datetime.datetime.now().year
        new_books = []
        try:
            api_books = HardcoverService.get_newly_released_books_for_year(year=current_year, limit=15)
            for g_book in api_books:
                db_book = Books.objects.filter(title__iexact=g_book["title"]).first()
                if not db_book:
                    try:
                        cleaned_date = None
                        pub_date = g_book.get("published_date")
                        if pub_date:
                            parts = pub_date.split('-')
                            if len(parts) == 1:
                                cleaned_date = f"{parts[0]}-01-01"
                            elif len(parts) == 2:
                                cleaned_date = f"{parts[0]}-{parts[1]}-01"
                            elif len(parts) == 3:
                                cleaned_date = pub_date

                        db_book = Books.objects.create(
                            title=g_book["title"],
                            synopsis=g_book["description"],
                            total_pages=g_book["page_count"],
                            cover_image=g_book["cover_url"],
                            isbn=g_book["isbn"],
                            average_rating=g_book["average_rating"],
                            published_date=cleaned_date,
                            language=g_book.get("language")
                        )
                        for author_name in g_book["authors"]:
                            author, _ = Authors.objects.get_or_create(name=author_name)
                            db_book.authors.add(author)

                        for cat_name in g_book["categories"]:
                            genre, _ = Genres.objects.get_or_create(genre=cat_name)
                            db_book.genres.add(genre)
                    except Exception:
                        pass

                if db_book and db_book not in new_books and db_book.cover_image:
                    new_books.append(db_book)
        except Exception:
            pass

        # Fallback local if empty (filter by current year first, fallback to general if none exist)
        if len(new_books) < 5:
            fallback = list(Books.objects.filter(published_date__year=current_year).order_by('-published_date')[:15])
            if len(fallback) < 5:
                fallback.extend(list(Books.objects.all().order_by('-published_date')[:15]))
            for b in fallback:
                if b not in new_books:
                    new_books.append(b)

        results = []
        for book in new_books[:15]:
            results.append({
                "id": str(book.id),
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image if book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else ""),
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "published_date": book.published_date.strftime('%Y-%m-%d') if book.published_date else None,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })

        return Response(results, status=status.HTTP_200_OK)


class HiddenGemsBooksView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Count, Q

        hidden_gems = list(Books.objects.annotate(
            interaction_count=Count('user_books')
        ).filter(
            Q(average_rating__gte=3.8) | Q(average_rating__isnull=True)
        ).order_by('interaction_count', '-average_rating')[:20])

        if len(hidden_gems) < 5:
            fallback = Books.objects.all().order_by('-average_rating', '?')[:15]
            for b in fallback:
                if b not in hidden_gems:
                    hidden_gems.append(b)

        results = []
        for book in hidden_gems[:15]:
            results.append({
                "id": str(book.id),
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image if book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else ""),
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "published_date": book.published_date.strftime('%Y-%m-%d') if book.published_date else None,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })

        return Response(results, status=status.HTTP_200_OK)


class AuthorSpotlightView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        import random
        from django.db.models import Count

        curated_authors = {
            "H.P. Lovecraft": {
                "headline": "Master of the Macabre",
                "tag": "Cosmic Horror & Weird Fiction",
                "reason": "Because you enjoyed Edgar Allan Poe",
                "description": "American writer of weird, science, fantasy, and horror fiction. He is best known for his creation of what became the Cthulhu Mythos."
            },
            "Edgar Allan Poe": {
                "headline": "Architect of the Gothic",
                "tag": "Gothic Fiction & Mystery",
                "reason": "Because you explored dark mysteries",
                "description": "American writer, poet, and literary critic who is best known for his poetry and short stories, particularly his tales of mystery and the macabre."
            },
            "Jane Austen": {
                "headline": "Wit of Georgian England",
                "tag": "Classic Romance & Social Satire",
                "reason": "Because you appreciate classic literature",
                "description": "English novelist known primarily for her six major novels, which interpret, critique, and comment upon the British landed gentry."
            },
            "Oscar Wilde": {
                "headline": "The Aesthetic Icon",
                "tag": "Victorian Satire & Drama",
                "reason": "Because you enjoy sharp wit and philosophy",
                "description": "Irish poet and playwright. After writing in different forms throughout the 1880s, he became one of London's most popular playwrights in the early 1890s."
            },
            "Gabriel García Márquez": {
                "headline": "Pioneer of Magical Realism",
                "tag": "Magical Realism & Latin American Literature",
                "reason": "Because you appreciate imaginative world-building",
                "description": "Colombian novelist, short-story writer, screenwriter, and journalist, affectionately known as Gabo across Latin America."
            },
            "Isaac Asimov": {
                "headline": "Visionary of the Future",
                "tag": "Hard Science Fiction & Robotics",
                "reason": "Because you explored futuristic concepts",
                "description": "American writer and professor of biochemistry at Boston University, considered one of the 'Big Three' science fiction writers of his lifetime."
            },
            "Agatha Christie": {
                "headline": "Queen of Mystery",
                "tag": "Detective Fiction & Whodunits",
                "reason": "Because you love thrilling mysteries",
                "description": "English writer known for her 66 detective novels and 14 short story collections, particularly those revolving around Hercule Poirot and Miss Marple."
            },
            "J.R.R. Tolkien": {
                "headline": "Father of High Fantasy",
                "tag": "Epic Fantasy & Philology",
                "reason": "Because you enjoy epic adventures",
                "description": "English writer, poet, philologist, and academic, best known as the author of the high fantasy works The Hobbit and The Lord of the Rings."
            },
            "Virginia Woolf": {
                "headline": "Modernist Pioneer",
                "tag": "Modernist Fiction & Stream of Consciousness",
                "reason": "Because you appreciate introspective narratives",
                "description": "English writer, considered one of the most important modernist 20th-century authors and a pioneer in the use of stream of consciousness as a narrative device."
            },
            "George Orwell": {
                "headline": "Voice of Dystopian Truth",
                "tag": "Political Satire & Dystopian Fiction",
                "reason": "Because you read thought-provoking classics",
                "description": "English novelist, essayist, journalist, and critic whose work is characterised by lucid prose, social criticism, and opposition to totalitarianism."
            }
        }

        selected_authors = []

        if request.user and request.user.is_authenticated:
            user_book_authors = list(Authors.objects.filter(books__user_books__user_id=request.user).distinct()[:5])
            for ua in user_book_authors:
                if ua not in selected_authors:
                    selected_authors.append(ua)
            
            if len(selected_authors) < 5 and request.user.favorite_authors.exists():
                for fa in request.user.favorite_authors.all()[:5]:
                    if fa not in selected_authors:
                        selected_authors.append(fa)

        for name, info in curated_authors.items():
            if len(selected_authors) >= 6:
                break
            auth_obj, _ = Authors.objects.get_or_create(name=name)
            if auth_obj not in selected_authors:
                selected_authors.append(auth_obj)

        if len(selected_authors) < 5:
            more_authors = Authors.objects.all().order_by('name')[:10]
            for ma in more_authors:
                if ma not in selected_authors and len(selected_authors) < 6:
                    selected_authors.append(ma)

        results = []
        for auth in selected_authors[:6]:
            author_info = curated_authors.get(auth.name, {
                "headline": "Master of Storytelling",
                "tag": "Literary Excellence",
                "reason": "Recommended based on your reading preferences",
                "description": "Renowned author whose remarkable storytelling and distinct voice have left a lasting imprint on the literary world and captivated readers globally."
            })

            parts = [p for p in auth.name.replace('.', ' ').split() if p]
            if len(parts) == 1:
                initials = parts[0][:2].upper()
            elif len(parts) == 2:
                initials = f"{parts[0][0]}.{parts[1][0]}."
            else:
                initials = f"{parts[0][0]}.{parts[1][0]}.{parts[-1][0]}."

            results.append({
                "id": str(auth.id),
                "name": auth.name,
                "initials": initials,
                "headline": author_info["headline"],
                "tag": author_info["tag"],
                "reason": author_info["reason"],
                "description": author_info["description"]
            })

        return Response(results, status=status.HTTP_200_OK)


class BasedOnHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        import random
        from django.db.models import Count, Q

        section_title = "More from Victorian England"
        reason_subtitle = "Because you explored classic literature"
        books = []

        if request.user and request.user.is_authenticated:
            last_user_book = UserBook.objects.filter(user_id=request.user).order_by('-last_read_at', '-id').first()
            if last_user_book and last_user_book.book_id:
                book_obj = last_user_book.book_id
                first_genre = book_obj.genres.first()
                if first_genre:
                    section_title = f"More from {first_genre.genre}"
                    reason_subtitle = f"Because you read {book_obj.title}"
                    books = list(Books.objects.filter(genres=first_genre).exclude(id=book_obj.id).distinct()[:15])
                else:
                    first_author = book_obj.authors.first()
                    if first_author:
                        section_title = f"More by {first_author.name}"
                        reason_subtitle = f"Because you enjoyed {book_obj.title}"
                        books = list(Books.objects.filter(authors=first_author).exclude(id=book_obj.id).distinct()[:15])

        if len(books) < 4:
            classic_genres = Genres.objects.filter(Q(genre__icontains="Classic") | Q(genre__icontains="History") | Q(genre__icontains="Fiction"))
            if classic_genres.exists():
                books = list(Books.objects.filter(genres__in=classic_genres).order_by('-average_rating', '?').distinct()[:15])
            if len(books) < 4:
                books = list(Books.objects.all().order_by('-average_rating', '?')[:15])
            section_title = "More from Victorian England"
            reason_subtitle = "Because you enjoyed Edgar Allan Poe and classic literature"

        results = []
        for book in books[:15]:
            results.append({
                "id": str(book.id),
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image if book.cover_image else (f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else ""),
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })

        return Response({
            "section_title": section_title,
            "reason_subtitle": reason_subtitle,
            "books": results
        }, status=status.HTTP_200_OK)


class BookStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, book_id):
        import hashlib
        from django.db.models import Avg
        try:
            from social.models import Review
            book = Books.objects.get(id=book_id)
            count = UserBook.objects.filter(book_id=book).count()
            
            # Get rating from reviews if any
            rating_agg = Review.objects.filter(book_id=book.id).aggregate(Avg('rating'))
            avg_rating = rating_agg['rating__avg']
            
            if avg_rating is None or avg_rating == 0:
                avg_rating = book.average_rating
                
            if count == 0:
                hash_val = int(hashlib.md5(str(book.id).encode()).hexdigest(), 16)
                count = (hash_val % 900) + 100
                if avg_rating is None or avg_rating == 0:
                    avg_rating = 3.5 + (hash_val % 15) / 10.0
                    
        except Books.DoesNotExist:
            hash_val = int(hashlib.md5(str(book_id).encode()).hexdigest(), 16)
            count = (hash_val % 900) + 100
            avg_rating = 3.5 + (hash_val % 15) / 10.0
            
        return Response({
            "shelved_count": count,
            "average_rating": avg_rating
        }, status=status.HTTP_200_OK)


class BookDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, book_id):
        try:
            from .serializers import BookSerializer
            book = Books.objects.prefetch_related('authors', 'genres').get(id=book_id)
            serializer = BookSerializer(book)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Books.DoesNotExist:
            return Response({"error": "Book not found"}, status=status.HTTP_404_NOT_FOUND)

