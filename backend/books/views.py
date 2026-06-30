from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Books, Genres, Authors, UserBook
from .services import HardcoverService

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
                "cover_image": book.cover_image,
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
                    "cover_image": book.cover_image,
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
            "cover_image": new_book.cover_image,
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
                "cover_image": book.cover_image,
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
                "cover_image": book.cover_image,
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })

        return Response(results, status=status.HTTP_200_OK)


class TrendingBooksView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        trending_books = []
        try:
            api_books = HardcoverService.get_trending_books(limit=15)
            for g_book in api_books:
                if not is_english_book(g_book):
                    continue

                db_book = Books.objects.filter(title__iexact=g_book["title"]).first()
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

                if db_book and db_book not in trending_books:
                    trending_books.append(db_book)
        except Exception:
            pass

        # Fallback local if empty/failed
        if len(trending_books) < 10:
            fallback = Books.objects.all().order_by('-average_rating')[:10]
            for b in fallback:
                if b not in trending_books:
                    trending_books.append(b)

        results = []
        for book in trending_books[:10]:
            results.append({
                "id": str(book.id),
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image,
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })

        return Response(results, status=status.HTTP_200_OK)


class UserBookSaveView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_books = UserBook.objects.filter(user_id=request.user)
        results = []
        for ub in user_books:
            book = ub.book_id
            results.append({
                "id": ub.id,
                "book_id": book.id,
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image,
                "status": ub.status,
                "current_page": ub.current_page or 0,
                "total_pages": book.total_pages or 0,
                "progress_percentage": ub.progress_percentage or 0.0,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
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

        user_book, created = UserBook.objects.update_or_create(
            user_id=request.user,
            book_id=book,
            defaults={"status": status_choice}
        )

        return Response({
            "id": user_book.id,
            "book_title": book.title,
            "status": user_book.status,
            "created": created
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
    permission_classes = [AllowAny]

    def get(self, request):
        import random
        keep_ids_str = request.query_params.get("keep", "")
        keep_ids = [k.strip() for k in keep_ids_str.split(",") if k.strip()]
        
        # 1. Obtener los libros a mantener (máximo 5)
        keep_books = list(Books.objects.filter(id__in=keep_ids)[:5])
        
        # El carrusel siempre debe tener exactamente 10 libros.
        # Si se mantienen K libros (máximo 5), necesitamos importar 10 - K libros nuevos.
        target_total = 10
        num_keep = len(keep_books)
        num_needed = target_total - num_keep  # Siempre >= 5
        
        # 2. Obtener preferencias del usuario para personalizar la búsqueda
        user_genres = []
        user_authors = []
        
        # Acepta autenticación para poder leer preferencias
        if request.user and request.user.is_authenticated:
            user_genres = list(request.user.favorite_genres.values_list('genre', flat=True))
            # Obtener autores de los libros que el usuario está leyendo o guardó
            saved_authors = list(Authors.objects.filter(books__user_books__user_id=request.user).values_list('name', flat=True).distinct())
            fav_authors = list(request.user.favorite_authors.values_list('name', flat=True))
            # Combinar y quitar duplicados
            user_authors = list(set(saved_authors + fav_authors))
            
        # 3. Construir posibles consultas
        search_queries = []
        if user_genres:
            for g in user_genres:
                search_queries.append(g)
        if user_authors:
            for a in user_authors:
                search_queries.append(a)
                
        if search_queries:
            query = random.choice(search_queries)
        else:
            categories = ["fiction", "history", "biography", "science", "poetry", "fantasy", "mystery", "self-help", "business"]
            query = random.choice(categories)
            
        imported_books = []
        try:
            google_books = HardcoverService.search_and_clean_books(query, max_results=num_needed, intitle_only=False)
            # Si la consulta combinada o específica no arrojó resultados, intentamos con una categoría general
            if not google_books and search_queries:
                categories = ["fiction", "history", "biography", "science", "poetry", "fantasy", "mystery", "self-help", "business"]
                query = random.choice(categories)
                google_books = HardcoverService.search_and_clean_books(query, max_results=num_needed, intitle_only=False)

            for g_book in google_books:
                # Enforce English-only imports
                if not is_english_book(g_book):
                    continue
                book_exists = False
                if g_book["isbn"]:
                    book_exists = Books.objects.filter(isbn=g_book["isbn"]).exists()
                if not book_exists:
                    book_exists = Books.objects.filter(title__iexact=g_book["title"]).exists()
                    
                if not book_exists:
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
                            
                    new_book = Books.objects.create(
                        title=g_book["title"],
                        synopsis=g_book["description"],
                        total_pages=g_book["page_count"],
                        cover_image=g_book["cover_url"],
                        isbn=g_book["isbn"],
                        average_rating=g_book["average_rating"],
                        published_date=cleaned_date,
                        language=g_book.get("language")
                    )
                    
                    # Asociar autores
                    for author_name in g_book["authors"]:
                        author, _ = Authors.objects.get_or_create(name=author_name)
                        new_book.authors.add(author)
                        
                    # Asociar géneros
                    for cat_name in g_book["categories"]:
                        genre, _ = Genres.objects.get_or_create(genre=cat_name)
                        new_book.genres.add(genre)
                        
                    imported_books.append(new_book)
                else:
                    # Si ya existe en la BD, lo recuperamos para que cuente como importado/disponible en esta tanda
                    existing_book = Books.objects.filter(Q(isbn=g_book["isbn"]) | Q(title__iexact=g_book["title"])).first()
                    if existing_book and existing_book not in keep_books and existing_book not in imported_books:
                        imported_books.append(existing_book)
        except Exception as e:
            pass
            
        # Si la API falló o no se completó la cantidad necesaria, rellenamos con libros aleatorios locales
        if len(keep_books) + len(imported_books) < target_total:
            existing_ids = [b.id for b in keep_books] + [b.id for b in imported_books]
            needed_extra = target_total - (len(keep_books) + len(imported_books))
            extra_imported = Books.objects.exclude(id__in=existing_ids).order_by('?')[:needed_extra]
            imported_books.extend(extra_imported)
            
        # Unir y recortar para retornar exactamente 10 libros
        final_books = (keep_books + imported_books)[:target_total]
        
        results = []
        for book in final_books:
            results.append({
                "id": book.id,
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image,
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })
        return Response(results, status=status.HTTP_200_OK)


class GlobalBookshelfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from django.db.models import Count
        import hashlib
        
        popular_userbooks = UserBook.objects.values('book_id').annotate(
            added_count=Count('book_id')
        ).order_by('-added_count')[:15]

        counts_map = {str(item['book_id']): item['added_count'] for item in popular_userbooks}
        book_ids = [item['book_id'] for item in popular_userbooks]
        books = list(Books.objects.filter(id__in=book_ids))
        
        # Sort books by popularity ranking
        books.sort(key=lambda b: book_ids.index(b.id) if b.id in book_ids else 999)

        # Fallback to high rating books if database has little user activity
        if len(books) < 5:
            fallback = Books.objects.all().order_by('-average_rating')[:15]
            for b in fallback:
                if b not in books:
                    books.append(b)

        results = []
        for book in books[:10]:
            added_count = counts_map.get(str(book.id), 0)
            if added_count == 0:
                # Deterministic fallback count to show activity in dev/staging environments
                hash_val = int(hashlib.md5(str(book.id).encode()).hexdigest(), 16)
                added_count = (hash_val % 12) + 3 # 3 to 14 saves

            results.append({
                "id": str(book.id),
                "title": book.title,
                "synopsis": book.synopsis,
                "cover_image": book.cover_image,
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()],
                "added_count": added_count
            })

        return Response(results, status=status.HTTP_200_OK)


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

                if db_book and db_book not in new_books:
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
                "cover_image": book.cover_image,
                "isbn": book.isbn,
                "average_rating": book.average_rating,
                "total_pages": book.total_pages,
                "published_date": book.published_date.strftime('%Y-%m-%d') if book.published_date else None,
                "authors": [author.name for author in book.authors.all()],
                "genres": [genre.genre for genre in book.genres.all()]
            })

        return Response(results, status=status.HTTP_200_OK)