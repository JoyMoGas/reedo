"""
@project Reedo
@module clear_books_catalog
@description Django management command to cleanly purge polluted books, user-book associations, and stale cached data.
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache
from books.models import Books, UserBook, Authors, Genres, ImmersionMode, ReadingNote, LibraryBook


class Command(BaseCommand):
    help = "Purges all books and user-book relationships from database and clears the cache for a clean slate"

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Bypass confirmation prompt',
        )

    def handle(self, *args, **options):
        book_count = Books.objects.count()
        userbook_count = UserBook.objects.count()

        self.stdout.write(self.style.WARNING(
            f"Found {book_count} Books and {userbook_count} UserBook entries to purge."
        ))

        if not options['force']:
            confirm = input("Are you sure you want to delete ALL books and user-books? (y/N): ")
            if confirm.lower() != 'y':
                self.stdout.write(self.style.NOTICE("Operation cancelled."))
                return

        self.stdout.write("Deleting ReadingNotes and ImmersionModes...")
        ReadingNote.objects.all().delete()
        ImmersionMode.objects.all().delete()

        self.stdout.write("Deleting LibraryBook relations...")
        LibraryBook.objects.all().delete()

        self.stdout.write("Deleting UserBooks...")
        UserBook.objects.all().delete()

        self.stdout.write("Deleting Books...")
        deleted_books, _ = Books.objects.all().delete()

        self.stdout.write("Cleaning orphan Authors and Genres...")
        orphan_authors, _ = Authors.objects.filter(books__isnull=True).delete()
        orphan_genres, _ = Genres.objects.filter(books__isnull=True).delete()

        self.stdout.write("Clearing Django cache...")
        cache.clear()

        self.stdout.write(self.style.SUCCESS(
            f"Database cleaned successfully! Deleted {deleted_books} books, "
            f"{orphan_authors} orphan authors, {orphan_genres} orphan genres. Cache cleared."
        ))
