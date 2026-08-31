"""
@project Reedo
@module seed_books
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-06-26
"""
import time
from django.core.management.base import BaseCommand
from books.models import Books, Genres, Authors
from books.services import HardcoverService

class Command(BaseCommand):
    help = "Seeds the database with initial popular books from Hardcover API"

    def handle(self, *args, **options):
        queries = [
            "fiction",
            "science",
            "history",
            "biography",
            "fantasy",
            "mystery",
            "business",
            "self-help"
        ]
        
        books_created = 0
        books_skipped = 0

        self.stdout.write(self.style.WARNING("Starting book database seeding..."))

        for query in queries:
            self.stdout.write(f"Fetching books for query: '{query}'...")

            try:
                hardcover_books = HardcoverService.search_and_clean_books(
                    query, max_results=20, intitle_only=False
                )

                if not hardcover_books:
                    self.stdout.write(self.style.NOTICE(f"No books found for query '{query}'"))
                    continue

                for item in hardcover_books:
                    title = item.get("title")
                    isbn = item.get("isbn")
                    
                    if not title:
                        continue

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
                    description = item.get("description", "No Description Available")
                    page_count = item.get("page_count", 0)
                    cover_url = item.get("cover_url", "")
                    average_rating = item.get("average_rating", 0.0)
                    authors_list = item.get("authors", ["Unknown Author"])
                    categories_list = item.get("categories", ["No Category Available"])

                    try:
                        # Crear el libro
                        new_book = Books.objects.create(
                            title=title,
                            synopsis=description,
                            total_pages=page_count,
                            cover_image=cover_url,
                            isbn=isbn,
                            average_rating=average_rating
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
