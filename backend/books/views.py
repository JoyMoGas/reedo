from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Books, Genres, Authors, UserBook
from .services import GoogleBooksService

def is_english_book(g_book):
    lang = g_book.get("language")
    if lang:
        return lang.lower() == "en"
    
    # Fallback to langdetect if no language metadata is provided
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

        # 2. Si no se encuentra en BD local, buscar en Google Books API
        google_books = GoogleBooksService.search_and_clean_books(query, max_results=1)
        
        if not google_books:
            return Response({"error": "Book not found in Google Books"}, status=status.HTTP_404_NOT_FOUND)

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

        # 1. Búsqueda local por Título, ISBN o Autor
        local_books = Books.objects.filter(
            Q(title__icontains=query) |
            Q(isbn=query) |
            Q(authors__name__icontains=query)
        ).distinct()[:10]

        results = []
        local_isbns = set()
        local_titles = set()

        for book in local_books:
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
            if book.isbn:
                local_isbns.add(book.isbn.lower().strip())
            local_titles.add(book.title.lower().strip())

        # 2. Buscar en la API de Google Books para complementar de inmediato los resultados
        books_to_save_bg = []
        try:
            google_books = GoogleBooksService.search_and_clean_books(query, max_results=30)
            for g_book in google_books:
                # Enforce English-only imports
                if not is_english_book(g_book):
                    continue

                # Evitar duplicados en la respuesta con lo que ya encontramos localmente
                is_dup = False
                if g_book["isbn"] and g_book["isbn"].lower().strip() in local_isbns:
                    is_dup = True
                if g_book["title"].lower().strip() in local_titles:
                    is_dup = True

                if is_dup:
                    continue

                # Validar si ya existe en la base de datos (pero no salió en la consulta local inicial)
                db_book = None
                if g_book["isbn"]:
                    db_book = Books.objects.filter(isbn=g_book["isbn"]).first()
                if not db_book:
                    db_book = Books.objects.filter(title__iexact=g_book["title"]).first()

                if db_book:
                    results.append({
                        "id": str(db_book.id),
                        "title": db_book.title,
                        "synopsis": db_book.synopsis,
                        "cover_image": db_book.cover_image,
                        "isbn": db_book.isbn,
                        "average_rating": db_book.average_rating,
                        "total_pages": db_book.total_pages,
                        "authors": [author.name for author in db_book.authors.all()],
                        "genres": [genre.genre for genre in db_book.genres.all()]
                    })
                else:
                    # Libro nuevo: pregeneramos un UUID para la respuesta instantánea
                    new_id = str(uuid.uuid4())
                    results.append({
                        "id": new_id,
                        "title": g_book["title"],
                        "synopsis": g_book["description"],
                        "cover_image": g_book["cover_url"],
                        "isbn": g_book["isbn"],
                        "average_rating": g_book["average_rating"],
                        "total_pages": g_book["page_count"],
                        "authors": g_book["authors"],
                        "genres": g_book["categories"]
                    })
                    
                    # Preparar para guardar en segundo plano
                    g_book_save = g_book.copy()
                    g_book_save["id"] = new_id
                    books_to_save_bg.append(g_book_save)

        except Exception as e:
            # Omitir fallos de API externa
            pass

        # 3. Lanzar el guardado en segundo plano si hay libros nuevos
        if books_to_save_bg:
            save_books_in_background(books_to_save_bg)

        return Response(results[:15], status=status.HTTP_200_OK)


class GenreListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
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
        
        if user_genres.exists():
            # Buscar libros asociados a estos géneros
            books = Books.objects.filter(genres__in=user_genres).distinct()
            # Obtener autores de estos libros
            authors = Authors.objects.filter(books__in=books).distinct()[:15]
        else:
            authors = []

        # Si hay pocos autores sugeridos, rellenamos con autores populares de la BD
        if len(authors) < 5:
            popular_authors = Authors.objects.all().order_by('name')[:15]
            # Combinamos usando un set para evitar duplicados
            combined_authors = list(authors) + [a for a in popular_authors if a not in authors]
            authors = combined_authors[:15]

        return Response([{"id": a.id, "name": a.name} for a in authors], status=status.HTTP_200_OK)


class AuthorSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("query") or request.query_params.get("q")
        if not query:
            return Response({"error": "Query parameter 'query' or 'q' is required"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Búsqueda local por nombre de autor
        local_authors = Authors.objects.filter(name__icontains=query)[:10]

        # 2. Si no hay suficientes autores locales, buscar en Google Books API e importarlos
        if len(local_authors) < 3:
            try:
                google_authors = GoogleBooksService.search_authors(query, max_results=5)
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
        suggested_books = Books.objects.filter(
            Q(genres__in=user_genres) | Q(authors__in=user_authors)
        ).distinct()[:20]

        # Si no hay suficientes recomendaciones, rellenamos con los mejor calificados
        if len(suggested_books) < 5:
            fallback_books = Books.objects.all().order_by('-average_rating')[:20]
            combined = list(suggested_books) + [b for b in fallback_books if b not in suggested_books]
            suggested_books = combined[:20]

        results = []
        for book in suggested_books:
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
                search_queries.append(f"subject:{g}")
        if user_authors:
            for a in user_authors:
                search_queries.append(f"inauthor:\"{a}\"")
        if user_genres and user_authors:
            for _ in range(3):
                search_queries.append(f"subject:{random.choice(user_genres)} inauthor:\"{random.choice(user_authors)}\"")
                
        if search_queries:
            query = random.choice(search_queries)
        else:
            categories = ["fiction", "history", "biography", "science", "poetry", "fantasy", "mystery", "self-help", "business"]
            query = f"subject:{random.choice(categories)}"
            
        imported_books = []
        try:
            google_books = GoogleBooksService.search_and_clean_books(query, max_results=num_needed)
            # Si la consulta combinada o específica no arrojó resultados, intentamos con una categoría general
            if not google_books and search_queries:
                categories = ["fiction", "history", "biography", "science", "poetry", "fantasy", "mystery", "self-help", "business"]
                query = f"subject:{random.choice(categories)}"
                google_books = GoogleBooksService.search_and_clean_books(query, max_results=num_needed)

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