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
from .services import HardcoverService, sanitize_hardcover_books, is_valid_cover_url, is_blacklisted_title

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
        seen_titles = set()
        for book in local_books:
            if not _is_clean_real_book(book):
                continue
            norm_title = (book.title or "").strip().lower()
            if norm_title in seen_titles:
                continue
            seen_titles.add(norm_title)
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
            if len(results) >= 15:
                break

        return Response(results, status=status.HTTP_200_OK)


CURATED_BOOK_GENRES = [
    {"genre": "Literary Fiction", "category": "Fiction"},
    {"genre": "Classic Literature", "category": "Fiction"},
    {"genre": "Contemporary Fiction", "category": "Fiction"},
    {"genre": "Historical Fiction", "category": "Fiction"},
    {"genre": "Science Fiction", "category": "Speculative"},
    {"genre": "Fantasy", "category": "Speculative"},
    {"genre": "Dystopian", "category": "Speculative"},
    {"genre": "Magical Realism", "category": "Speculative"},
    {"genre": "Mystery & Thriller", "category": "Suspense"},
    {"genre": "Crime & Noir", "category": "Suspense"},
    {"genre": "Horror & Gothic", "category": "Suspense"},
    {"genre": "Romance", "category": "Fiction"},
    {"genre": "Adventure", "category": "Fiction"},
    {"genre": "Young Adult", "category": "Fiction"},
    {"genre": "Philosophy", "category": "Non-Fiction"},
    {"genre": "Psychology", "category": "Non-Fiction"},
    {"genre": "History", "category": "Non-Fiction"},
    {"genre": "Biography & Memoir", "category": "Non-Fiction"},
    {"genre": "Self-Help", "category": "Non-Fiction"},
    {"genre": "Science & Nature", "category": "Non-Fiction"},
    {"genre": "Business & Economics", "category": "Non-Fiction"},
    {"genre": "Poetry", "category": "Literature"},
    {"genre": "Essays & Criticism", "category": "Literature"},
    {"genre": "Mythology & Folklore", "category": "Literature"},
    {"genre": "Art & Architecture", "category": "Culture"},
    {"genre": "Politics & Society", "category": "Non-Fiction"},
    {"genre": "True Crime", "category": "Non-Fiction"},
    {"genre": "Humor & Satire", "category": "Fiction"},
]

CURATED_GENRE_CATEGORY_MAP = {
    item["genre"].lower(): item["category"] for item in CURATED_BOOK_GENRES
}

INVALID_AUTHOR_NAMES = {
    "unknown author",
    "unknown",
    "anonymous",
    "various",
    "various authors",
    "editors",
    "magazine",
    "periodical",
    "n/a",
}


def _is_clean_real_book(book) -> bool:
    if not book or not book.title:
        return False
    if is_blacklisted_title(book.title):
        return False
    cover = book.cover_image or (
        f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false"
        if book.isbn
        else ""
    )
    if not is_valid_cover_url(cover):
        return False
    if book.total_pages is not None and 0 < book.total_pages < 25:
        return False
    authors = [a.name.strip() for a in book.authors.all() if a.name and a.name.strip()]
    if not authors:
        return False
    if all(a.lower() in INVALID_AUTHOR_NAMES for a in authors):
        return False
    return True


class GenreListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = (request.query_params.get("q") or request.query_params.get("query") or "").strip()

        curated_names = [item["genre"] for item in CURATED_BOOK_GENRES]
        existing_map = {
            g.genre.lower(): g
            for g in Genres.objects.filter(genre__in=curated_names)
        }
        curated_objs = []
        for item in CURATED_BOOK_GENRES:
            g_name = item["genre"]
            g_obj = existing_map.get(g_name.lower())
            if not g_obj:
                g_obj, _ = Genres.objects.get_or_create(genre=g_name)
            curated_objs.append((g_obj, item["category"]))

        if not query:
            return Response(
                [
                    {"id": str(g.id), "genre": g.genre, "category": cat}
                    for g, cat in curated_objs
                ],
                status=status.HTTP_200_OK,
            )

        q_lower = query.lower()
        results = []
        seen_names = set()

        for g, cat in curated_objs:
            if q_lower in g.genre.lower() or q_lower in cat.lower():
                seen_names.add(g.genre.lower())
                results.append({"id": str(g.id), "genre": g.genre, "category": cat})

        db_matches = (
            Genres.objects.filter(genre__icontains=query)
            .exclude(genre__iexact="General")
            .order_by("genre")[:15]
        )
        for g in db_matches:
            norm = g.genre.strip().lower()
            if norm and norm not in seen_names and len(g.genre.strip()) <= 36:
                seen_names.add(norm)
                results.append(
                    {
                        "id": str(g.id),
                        "genre": g.genre.strip(),
                        "category": CURATED_GENRE_CATEGORY_MAP.get(norm, "Book Filter"),
                    }
                )

        clean_custom = " ".join(w.capitalize() for w in query.split())
        if (
            len(clean_custom) >= 3
            and len(clean_custom) <= 32
            and clean_custom.lower() not in seen_names
            and all(c.isalpha() or c in " -&'" for c in clean_custom)
        ):
            custom_genre, _ = Genres.objects.get_or_create(genre=clean_custom)
            seen_names.add(clean_custom.lower())
            results.append(
                {
                    "id": str(custom_genre.id),
                    "genre": custom_genre.genre,
                    "category": "Custom Filter",
                }
            )

        return Response(results[:24], status=status.HTTP_200_OK)


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
            genre_names = list(user_genres.values_list("genre", flat=True))
            books = Books.objects.filter(genres__in=user_genres).distinct()
            authors = [
                a
                for a in Authors.objects.filter(books__in=books).distinct()[:20]
                if a.name and a.name.strip().lower() not in INVALID_AUTHOR_NAMES
            ]

            if len(authors) < 10:
                try:
                    api_authors = HardcoverService.get_authors_by_genres(genre_names, limit=10)
                    for auth_name in api_authors:
                        if auth_name and auth_name.strip().lower() not in INVALID_AUTHOR_NAMES:
                            auth_obj, _ = Authors.objects.get_or_create(name=auth_name.strip())
                            if auth_obj not in authors:
                                authors.append(auth_obj)
                except Exception:
                    pass

        if len(authors) < 8:
            popular_authors = Authors.objects.all().order_by("name")[:25]
            for a in popular_authors:
                if (
                    a not in authors
                    and a.name
                    and a.name.strip().lower() not in INVALID_AUTHOR_NAMES
                ):
                    authors.append(a)

        return Response(
            [{"id": str(a.id), "name": a.name} for a in authors[:16]],
            status=status.HTTP_200_OK,
        )


class AuthorSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("query") or request.query_params.get("q")
        if not query:
            return Response(
                {"error": "Query parameter 'query' or 'q' is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        local_authors = list(Authors.objects.filter(name__icontains=query)[:10])

        if len(local_authors) < 3:
            try:
                google_authors = HardcoverService.search_authors(query, max_results=6)
                for auth_name in google_authors:
                    if auth_name and auth_name.strip().lower() not in INVALID_AUTHOR_NAMES:
                        Authors.objects.get_or_create(name=auth_name.strip())
            except Exception:
                pass

            local_authors = list(Authors.objects.filter(name__icontains=query)[:15])

        clean_authors = [
            {"id": str(a.id), "name": a.name}
            for a in local_authors
            if a.name and a.name.strip().lower() not in INVALID_AUTHOR_NAMES
        ]
        return Response(clean_authors, status=status.HTTP_200_OK)


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

        suggested_books = []
        seen_titles = set()
        seen_ids = set()

        def add_clean_book(book_obj):
            if not _is_clean_real_book(book_obj):
                return
            bid = str(book_obj.id)
            norm_title = book_obj.title.strip().lower()
            if bid in seen_ids or norm_title in seen_titles:
                return
            seen_ids.add(bid)
            seen_titles.add(norm_title)
            suggested_books.append(book_obj)

        if user_genres.exists() or user_authors.exists():
            local_candidates = (
                Books.objects.filter(Q(genres__in=user_genres) | Q(authors__in=user_authors))
                .exclude(cover_image__isnull=True)
                .exclude(cover_image="")
                .exclude(cover_image__icontains="placeholder")
                .order_by("-average_rating")
                .distinct()[:35]
            )
            for b in local_candidates:
                add_clean_book(b)

        if len(suggested_books) < 12:
            api_queries = []
            if user_authors.exists():
                api_queries.extend(list(user_authors.values_list("name", flat=True))[:3])
            if user_genres.exists():
                api_queries.extend(list(user_genres.values_list("genre", flat=True))[:3])

            for query in api_queries[:4]:
                try:
                    sanitized_list = HardcoverService.search_and_clean_books(
                        query, max_results=8, intitle_only=False
                    )
                    for item in sanitized_list:
                        if not is_english_book(item):
                            continue
                        db_book = Books.objects.filter(title__iexact=item["title"]).first()
                        if db_book:
                            add_clean_book(db_book)
                except Exception:
                    pass

        if len(suggested_books) < 12:
            try:
                discover_items = HardcoverService.get_discover_books(
                    limit=16, min_users=25, min_rating=3.5, sync_db=True
                )
                for item in discover_items:
                    db_book = Books.objects.filter(title__iexact=item["title"]).first()
                    if db_book:
                        add_clean_book(db_book)
            except Exception:
                pass

        if len(suggested_books) < 8:
            fallback_books = (
                Books.objects.exclude(cover_image__isnull=True)
                .exclude(cover_image="")
                .exclude(cover_image__icontains="placeholder")
                .order_by("-average_rating")[:30]
            )
            for b in fallback_books:
                add_clean_book(b)

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

        points_earned = 0
        old_page = user_book.current_page or 0

        if is_marking_completed:
            user_book.status = "COMPLETED"
            if total > 0:
                diff_pages = max(0, total - old_page)
                points_earned += diff_pages
                user_book.current_page = total
            points_earned += 50  # 50 bonus Honor Points for completing a book
            user_book.progress_percentage = 100.0
            user_book.finished_at = timezone.now().date()
            user_book.read_count = (user_book.read_count or 0) + 1
            update_fields.extend(["status", "current_page", "progress_percentage", "finished_at", "read_count"])
        else:
            if current_page is not None:
                new_page = int(current_page)
                diff_pages = max(0, new_page - old_page)
                points_earned += diff_pages  # 1 Honor Point per page read
                user_book.current_page = new_page
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

                # Award honor points for immersion: 1 point per 3 minutes (180s)
                if sec >= 180:
                    points_earned += max(1, sec // 180)
            except ValueError:
                return Response({"error": "session_seconds must be an integer"}, status=status.HTTP_400_BAD_REQUEST)

        if points_earned > 0:
            request.user.honor_points = (request.user.honor_points or 0) + points_earned
            request.user.save(update_fields=["honor_points"])
            user_book.honor_points = (user_book.honor_points or 0) + points_earned
            update_fields.append("honor_points")

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
            "honor_points_earned": points_earned,
            "total_honor_points": request.user.honor_points,
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

        followed_authors_param = [
            a.strip() for a in request.query_params.get("followed_authors", "").split(",") if a.strip()
        ]
        saved_authors_param = [
            a.strip() for a in request.query_params.get("saved_authors", "").split(",") if a.strip()
        ]
        liked_genres_param = [
            g.strip() for g in request.query_params.get("liked_genres", "").split(",") if g.strip()
        ]
        recent_searches_param = [
            q.strip() for q in request.query_params.get("recent_searches", "").split(",") if q.strip()
        ]

        # Gather user personalization signals if authenticated or provided via query params
        followed_author_names = set(followed_authors_param)
        saved_author_names = set(saved_authors_param)
        preferred_genre_names = set(liked_genres_param)
        excluded_book_ids = set()

        if request.user and request.user.is_authenticated:
            for fa in request.user.favorite_authors.all():
                followed_author_names.add(fa.name)
            for fg in request.user.favorite_genres.all():
                preferred_genre_names.add(fg.genre)
            for ub in UserBook.objects.filter(user_id=request.user).select_related("book_id"):
                if ub.book_id:
                    excluded_book_ids.add(str(ub.book_id.id))
                    for a in ub.book_id.authors.all():
                        saved_author_names.add(a.name)
                    for g in ub.book_id.genres.all():
                        preferred_genre_names.add(g.genre)

        has_personalization = bool(
            followed_author_names or saved_author_names or preferred_genre_names or recent_searches_param
        )

        cache_key = f"reedo:books:discover:limit={limit}:min_users={min_users}:min_rating={min_rating}"

        # 1. Check cache if no explicit force-refresh, no keep filter, and no personalization signals
        if not force_refresh and not keep_ids and not has_personalization:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                resp = Response(cached_data, status=status.HTTP_200_OK)
                resp["X-Cache"] = "HIT"
                return resp

        # 1b. Build personalized book recommendations from followed authors, searches, and saved/liked books
        personalized_pool = []
        if has_personalization:
            q_filter = Q()
            for a_name in list(followed_author_names)[:8]:
                q_filter |= Q(authors__name__icontains=a_name)
            for a_name in list(saved_author_names)[:6]:
                q_filter |= Q(authors__name__icontains=a_name)
            for s_query in recent_searches_param[:5]:
                q_filter |= Q(title__icontains=s_query) | Q(authors__name__icontains=s_query) | Q(genres__genre__icontains=s_query)
            for g_name in list(preferred_genre_names)[:6]:
                q_filter |= Q(genres__genre__icontains=g_name)

            if q_filter:
                candidate_qs = (
                    Books.objects.filter(q_filter)
                    .exclude(cover_image__isnull=True)
                    .exclude(cover_image="")
                    .exclude(cover_image__icontains="placeholder")
                    .distinct()[:40]
                )
                followed_lower = {a.lower() for a in followed_author_names}
                saved_lower = {a.lower() for a in saved_author_names}
                genres_lower = {g.lower() for g in preferred_genre_names}
                searches_lower = [s.lower() for s in recent_searches_param if s]

                scored_candidates = []
                for cb in candidate_qs:
                    if str(cb.id) in excluded_book_ids and str(cb.id) not in keep_ids:
                        continue
                    cb_authors = [a.name for a in cb.authors.all()]
                    cb_genres = [g.genre for g in cb.genres.all()]
                    score = float(cb.average_rating or 3.5)
                    if any(a.lower() in followed_lower for a in cb_authors):
                        score += 50.0
                    if any(a.lower() in saved_lower for a in cb_authors):
                        score += 30.0
                    if any(
                        sq in (cb.title or "").lower() or any(sq in a.lower() for a in cb_authors)
                        for sq in searches_lower
                    ):
                        score += 25.0
                    matching_genres = sum(1 for g in cb_genres if g.lower() in genres_lower)
                    score += matching_genres * 10.0
                    scored_candidates.append((score, cb, cb_authors, cb_genres))

                scored_candidates.sort(key=lambda x: x[0], reverse=True)
                for _, cb, cb_authors, cb_genres in scored_candidates[:limit]:
                    author_name = cb_authors[0] if cb_authors else "Unknown Author"
                    personalized_pool.append({
                        "book_id": str(cb.id),
                        "id": str(cb.id),
                        "title": cb.title,
                        "author": author_name,
                        "authors": cb_authors or [author_name],
                        "cover_url": cb.cover_image or "",
                        "cover_image": cb.cover_image or "",
                        "rating": cb.average_rating or 0.0,
                        "average_rating": cb.average_rating or 0.0,
                        "shelved_count": 0,
                        "added_count": 0,
                        "genres": cb_genres,
                        "categories": cb_genres,
                        "synopsis": cb.synopsis or "",
                        "description": cb.synopsis or "",
                        "total_pages": cb.total_pages or 0,
                        "pages": cb.total_pages or 0,
                    })

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

        # 5. Merge personalized recommendations with discovery pool and handle keep_ids
        merged_pool = []
        seen_pool_ids = set()
        for pb in personalized_pool:
            pid = str(pb.get("book_id") or pb.get("id"))
            if pid and pid not in seen_pool_ids:
                seen_pool_ids.add(pid)
                merged_pool.append(pb)
        for bp in books_pool:
            bid = str(bp.get("book_id") or bp.get("id"))
            if bid and bid not in seen_pool_ids and (bid not in excluded_book_ids or bid in keep_ids):
                seen_pool_ids.add(bid)
                merged_pool.append(bp)
        books_pool = merged_pool

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
        if not keep_ids and not has_personalization:
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

        followed_param = [
            a.strip() for a in request.query_params.get("followed_authors", "").split(",") if a.strip()
        ]
        saved_param = [
            a.strip() for a in request.query_params.get("saved_authors", "").split(",") if a.strip()
        ]
        genres_param = [
            g.strip() for g in request.query_params.get("liked_genres", "").split(",") if g.strip()
        ]

        followed_names = list(followed_param)
        saved_book_author_names = list(saved_param)
        preferred_genres = list(genres_param)

        if request.user and request.user.is_authenticated:
            for fa in request.user.favorite_authors.all():
                if fa.name not in followed_names:
                    followed_names.append(fa.name)
            for ua in Authors.objects.filter(books__user_books__user_id=request.user).distinct()[:8]:
                if ua.name not in saved_book_author_names:
                    saved_book_author_names.append(ua.name)
            for fg in request.user.favorite_genres.all():
                if fg.genre not in preferred_genres:
                    preferred_genres.append(fg.genre)

        followed_lower = {n.lower() for n in followed_names}
        seed_author_names = followed_names + [n for n in saved_book_author_names if n.lower() not in followed_lower]

        # Find related authors (authors who share genres with followed/saved authors)
        selected_authors = []
        custom_reasons = {}

        if seed_author_names:
            seed_q = Q()
            for s_name in seed_author_names[:6]:
                seed_q |= Q(name__iexact=s_name)
            seed_objs = list(Authors.objects.filter(seed_q))
            seed_genres = list(Genres.objects.filter(books__authors__in=seed_objs).distinct()[:8])

            if seed_genres:
                related_objs = (
                    Authors.objects.filter(books__genres__in=seed_genres)
                    .exclude(id__in=[so.id for so in seed_objs if so.name.lower() in followed_lower])
                    .distinct()[:8]
                )
                anchor_author = followed_names[0] if followed_names else seed_author_names[0]
                for rel in related_objs:
                    if rel not in selected_authors:
                        selected_authors.append(rel)
                        custom_reasons[rel.name] = f"Related to {anchor_author}"

        if preferred_genres and len(selected_authors) < 6:
            g_q = Q()
            for g_name in preferred_genres[:5]:
                g_q |= Q(books__genres__genre__icontains=g_name)
            genre_authors = Authors.objects.filter(g_q).distinct()[:8]
            for ga in genre_authors:
                if ga.name.lower() not in followed_lower and ga not in selected_authors:
                    selected_authors.append(ga)
                    custom_reasons[ga.name] = f"Because you enjoy {preferred_genres[0]}"

        for name, info in curated_authors.items():
            if len(selected_authors) >= 8:
                break
            auth_obj, _ = Authors.objects.get_or_create(name=name)
            if auth_obj not in selected_authors:
                selected_authors.append(auth_obj)
                if followed_names and name.lower() not in followed_lower:
                    custom_reasons[name] = f"Related to {followed_names[0]} & {info['tag'].split('&')[0].strip()}"

        if len(selected_authors) < 6:
            more_authors = Authors.objects.all().order_by('name')[:10]
            for ma in more_authors:
                if ma not in selected_authors and len(selected_authors) < 8:
                    selected_authors.append(ma)

        results = []
        for auth in selected_authors[:8]:
            author_info = curated_authors.get(auth.name, {
                "headline": "Master of Storytelling",
                "tag": "Literary Excellence",
                "reason": "Recommended based on your followed authors & library",
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
                "reason": custom_reasons.get(auth.name, author_info["reason"]),
                "description": author_info["description"],
                "is_followed": auth.name.lower() in followed_lower,
            })

        return Response(results, status=status.HTTP_200_OK)


class BasedOnHistoryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Q

        followed_param = [
            a.strip() for a in request.query_params.get("followed_authors", "").split(",") if a.strip()
        ]
        saved_param = [
            a.strip() for a in request.query_params.get("saved_authors", "").split(",") if a.strip()
        ]
        genres_param = [
            g.strip() for g in request.query_params.get("liked_genres", "").split(",") if g.strip()
        ]
        searches_param = [
            q.strip() for q in request.query_params.get("recent_searches", "").split(",") if q.strip()
        ]

        followed_names = list(followed_param)
        saved_author_names = list(saved_param)
        preferred_genres = list(genres_param)
        saved_book_ids = set()
        last_book_title = None

        if request.user and request.user.is_authenticated:
            for fa in request.user.favorite_authors.all():
                if fa.name not in followed_names:
                    followed_names.append(fa.name)
            for fg in request.user.favorite_genres.all():
                if fg.genre not in preferred_genres:
                    preferred_genres.append(fg.genre)
            user_books_qs = UserBook.objects.filter(user_id=request.user).select_related("book_id").order_by('-last_read_at', '-id')
            for ub in user_books_qs:
                if ub.book_id:
                    saved_book_ids.add(ub.book_id.id)
                    if not last_book_title:
                        last_book_title = ub.book_id.title
                    for a in ub.book_id.authors.all():
                        if a.name not in saved_author_names:
                            saved_author_names.append(a.name)
                    for g in ub.book_id.genres.all():
                        if g.genre not in preferred_genres:
                            preferred_genres.append(g.genre)

        section_title = "Curated for Your Literary Taste"
        reason_subtitle = "Based on authors you follow, searches & your saved library"
        books = []

        # 1. Prioritize books by followed authors, recent searches, and saved/liked book authors & genres
        q_filter = Q()
        for a_name in followed_names[:6]:
            q_filter |= Q(authors__name__icontains=a_name)
        for sq in searches_param[:5]:
            q_filter |= Q(title__icontains=sq) | Q(authors__name__icontains=sq) | Q(genres__genre__icontains=sq)
        for sa_name in saved_author_names[:5]:
            q_filter |= Q(authors__name__icontains=sa_name)
        for g_name in preferred_genres[:5]:
            q_filter |= Q(genres__genre__icontains=g_name)

        if q_filter:
            candidates = (
                Books.objects.filter(q_filter)
                .exclude(id__in=saved_book_ids)
                .exclude(cover_image__isnull=True)
                .exclude(cover_image="")
                .distinct()[:30]
            )
            followed_lower = {a.lower() for a in followed_names}
            saved_lower = {a.lower() for a in saved_author_names}
            searches_lower = [s.lower() for s in searches_param if s]
            genres_lower = {g.lower() for g in preferred_genres}

            scored = []
            for b in candidates:
                b_authors = [a.name for a in b.authors.all()]
                b_genres = [g.genre for g in b.genres.all()]
                score = float(b.average_rating or 3.5)
                if any(a.lower() in followed_lower for a in b_authors):
                    score += 50.0
                if any(sq in (b.title or "").lower() or any(sq in a.lower() for a in b_authors) for sq in searches_lower):
                    score += 35.0
                if any(a.lower() in saved_lower for a in b_authors):
                    score += 25.0
                score += sum(10.0 for g in b_genres if g.lower() in genres_lower)
                scored.append((score, b))

            scored.sort(key=lambda x: x[0], reverse=True)
            books = [item[1] for item in scored[:15]]

            if followed_names:
                section_title = f"From {followed_names[0]} & Related Voices"
                reason_parts = [f"you follow {followed_names[0]}"]
                if searches_param:
                    reason_parts.append(f"searched '{searches_param[0]}'")
                elif last_book_title:
                    reason_parts.append(f"saved {last_book_title}")
                reason_subtitle = "Because " + " and ".join(reason_parts)
            elif searches_param:
                section_title = f"Inspired by '{searches_param[0]}'"
                reason_subtitle = "Based on your recent searches and saved books"
            elif last_book_title:
                section_title = f"Because You Saved {last_book_title}"
                reason_subtitle = f"More in {', '.join(preferred_genres[:2]) or 'your favorite genres'}"

        if len(books) < 4:
            classic_genres = Genres.objects.filter(Q(genre__icontains="Classic") | Q(genre__icontains="History") | Q(genre__icontains="Fiction"))
            if classic_genres.exists():
                fallback_qs = Books.objects.filter(genres__in=classic_genres).exclude(id__in=saved_book_ids).order_by('-average_rating').distinct()[:15]
                for fb in fallback_qs:
                    if fb not in books:
                        books.append(fb)
            if len(books) < 4:
                for fb in Books.objects.exclude(id__in=saved_book_ids).order_by('-average_rating')[:15]:
                    if fb not in books:
                        books.append(fb)

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

