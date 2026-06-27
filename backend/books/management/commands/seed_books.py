import time
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from books.models import Books, Genres, Authors

class Command(BaseCommand):
    help = "Seeds the database with initial popular books from Google Books API"

    def handle(self, *args, **options):
        queries = [
            "subject:fiction",
            "subject:science",
            "subject:history",
            "subject:biography",
            "subject:fantasy",
            "subject:mystery",
            "subject:business",
            "subject:self-help"
        ]
        api_key = getattr(settings, 'GOOGLE_BOOKS_API_KEY', None)
        base_url = "https://www.googleapis.com/books/v1/volumes"
        
        books_created = 0
        books_skipped = 0

        self.stdout.write(self.style.WARNING("Starting book database seeding..."))

        # Validar si la API Key es real o placeholder
        if api_key and not str(api_key).startswith("AIzaSy"):
            self.stdout.write(self.style.WARNING("Dummy API Key detected. Making requests without key..."))
            api_key = None

        for query in queries:
            self.stdout.write(f"Fetching books for query: '{query}'...")
            params = {
                'q': query,
                'maxResults': 20,
                'orderBy': 'relevance',
                'printType': 'books'
            }
            if api_key:
                params['key'] = api_key

            try:
                response = requests.get(base_url, params=params)
                response.raise_for_status()
                data = response.json()

                if "items" not in data:
                    self.stdout.write(self.style.NOTICE(f"No books found for query '{query}'"))
                    continue

                for item in data["items"]:
                    volume_info = item.get("volumeInfo", {})
                    title = volume_info.get("title")
                    
                    if not title:
                        continue

                    # Extraer ISBN
                    identifiers = volume_info.get("industryIdentifiers", [])
                    isbn = None
                    for id_obj in identifiers:
                        if id_obj.get("type") == "ISBN_13":
                            isbn = id_obj.get("identifier")
                    if not isbn and identifiers:
                        isbn = identifiers[0].get("identifier")

                    # Verificar si ya existe en la base de datos local por ISBN o Título
                    book_exists = False
                    if isbn:
                        book_exists = Books.objects.filter(isbn=isbn).exists()
                    if not book_exists:
                        book_exists = Books.objects.filter(title__iexact=title).exists()

                    if book_exists:
                        books_skipped += 1
                        continue

                    # Mapear los datos para la creación
                    description = volume_info.get("description", "No Description Available")
                    page_count = volume_info.get("pageCount", 0)
                    cover_url = volume_info.get("imageLinks", {}).get("thumbnail", "")
                    average_rating = volume_info.get("averageRating", 0.0)
                    published_date = volume_info.get("publishedDate", None)
                    authors_list = volume_info.get("authors", ["Unknown Author"])
                    categories_list = volume_info.get("categories", ["No Category Available"])

                    # Limpiar o parsear la fecha de publicación
                    # Google Books puede devolver 'YYYY', 'YYYY-MM', o 'YYYY-MM-DD'. Django DateField espera 'YYYY-MM-DD'
                    cleaned_date = None
                    if published_date:
                        parts = published_date.split('-')
                        if len(parts) == 1: # 'YYYY'
                            cleaned_date = f"{parts[0]}-01-01"
                        elif len(parts) == 2: # 'YYYY-MM'
                            cleaned_date = f"{parts[0]}-{parts[1]}-01"
                        elif len(parts) == 3: # 'YYYY-MM-DD'
                            cleaned_date = published_date

                    try:
                        # Crear el libro
                        new_book = Books.objects.create(
                            title=title,
                            synopsis=description,
                            total_pages=page_count,
                            cover_image=cover_url,
                            isbn=isbn,
                            average_rating=average_rating,
                            published_date=cleaned_date
                        )

                        # Crear/asociar autores
                        for author_name in authors_list:
                            author, _ = Authors.objects.get_or_create(name=author_name)
                            new_book.authors.add(author)

                        # Crear/asociar géneros
                        for cat_name in categories_list:
                            genre, _ = Genres.objects.get_or_create(genre=cat_name)
                            new_book.genres.add(genre)

                        books_created += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Error creating book '{title}': {str(e)}"))

                # Evitar saturar la API
                time.sleep(2)

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"API Error for query '{query}': {str(e)}"))

        self.stdout.write(self.style.SUCCESS(
            f"Seeding completed! Created: {books_created} books. Skipped: {books_skipped} duplicate/existing books."
        ))
