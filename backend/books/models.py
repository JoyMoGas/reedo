from django.contrib.auth.password_validation import password_validators_help_text_html
from django.db import models
import uuid
from django.conf import settings


# ===================================================================


class Books(models.Model):
  """
  Represents a book in the system catalog, storing metadata such as title,
  authors, synopsis, pages, genre, publication date, and rating.
  """
  id = models.UUIDField(
    primary_key=True, 
    default=uuid.uuid4, 
    editable=False
  )
  
  title = models.CharField(
    max_length=255,
    null=False,
    blank=False,
    help_text="Title of the book"
  )

  authors = models.JSONField(
    default=list,
    blank=False,
    help_text="List of authors"
  )

  synopsis = models.TextField(
    null=True, 
    blank=True,
    help_text="Synopsis of the book"
  )

  cover_image = models.URLField(
    null=True, 
    blank=True,
    help_text="URL of the cover image"
  )

  genres = models.JSONField(
    default=list,
    blank=False,
    help_text="List of genres"
  )

  total_pages = models.IntegerField(
    null=True, 
    blank=True,
    help_text="Total pages of the book"
  )

  total_chapters = models.IntegerField(
    null=True, 
    blank=True,
    help_text="Total chapters of the book"
  )

  published_date = models.DateField(
    null=True, 
    blank=True,
    help_text="Date when book was published"
  )

  purchase_links = models.JSONField(
    default=list,
    blank=True,
    help_text="List of purchase links"
  )

  language = models.CharField(
    max_length=50,
    null=True, 
    blank=True,
    help_text="Language of the book"
  )

  average_rating = models.FloatField(
    null=True, 
    blank=True,
    help_text="Average rating of the book"
  )

  def __str__(self):
    return f"{self.title}"


# ===================================================================


class UserBook(models.Model):
  """
  Tracks a user's relationship with a book, including reading status,
  progress, earned honor points, and reading timestamps.
  """
  STATUS_CHOICES = [
    ('CURRENTLY_READING', 'Currently Reading'),
    ('READ_LATER', 'Read Later / Wishlist'),
    ('COMPLETED', 'Completed'),
    ('ABANDONED', 'Abandoned'),
  ]

  id = models.UUIDField(
    primary_key=True, 
    default=uuid.uuid4, 
    editable=False
  )

  user_id = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="user_books",
    help_text="User to which this book belongs"
  )

  book_id = models.ForeignKey(
    Books,
    on_delete=models.CASCADE,
    related_name="user_books",
    help_text="Book to which this user belongs"
  )

  status = models.CharField(
    max_length=20,
    choices=STATUS_CHOICES,
    default='READ_LATER',
    help_text="Status of the book for the user"
  )

  current_page = models.IntegerField(
    null=True, 
    blank=True,
    help_text="Current page of the book"
  )

  progress_percentage = models.FloatField(
    null=True, 
    blank=True,
    help_text="Progress percentage of the book"
  )

  is_primary_reading = models.BooleanField(
    default=False,
    help_text="Whether the book is the primary book being read"
  )

  honor_points = models.IntegerField(
    default=0,
    editable=False,
    help_text="Honor points earned for this book"
  )

  last_read_at = models.DateField(
    auto_now=True,
    help_text="Date when book was last read"
  )

  started_at = models.DateField(
    auto_now_add=True,
    editable=False,
    help_text="Date when book was started"
  )

  finished_at = models.DateField(
    auto_now=True,
    help_text="Date when book was finished"
  )

  class Meta:
    unique_together = ('user_id', 'book_id')

  def __str__(self):
    return f"{self.user_id.username} - {self.book_id.title}"


# ===================================================================


class ImmersionMode(models.Model):
  """
  Represents a timed or infinite reading session associated with a user's book
  in immersion reading mode.
  """
  SESSION_CHOICES = [
    ('TIMED', 'Timed Session'),
    ('INFINITE', 'Infinite Stopwatch'),
  ]

  id = models.UUIDField(
    primary_key=True, 
    default=uuid.uuid4, 
    editable=False
  )

  user_book = models.OneToOneField(
    UserBook,
    on_delete=models.CASCADE,
    related_name="immersion_mode",
    help_text="User book to which this immersion mode belongs"
  )

  duration_minutes = models.IntegerField(
    null=True, 
    blank=True,
    help_text="Duration of the session in minutes"
  )

  session_type = models.CharField(
    max_length=50,
    choices=SESSION_CHOICES,
    default='TIMED',
    help_text="Type of the session"
  )

  created_at = models.DateTimeField(
    auto_now_add=True,
    editable=False,
    help_text="Date when session was created"
  )


# ===================================================================


class ReadingNote(models.Model):
  """
  Stores notes or thoughts written by a user on a specific page during
  a reading session.
  """
  id = models.UUIDField(
    primary_key=True, 
    default=uuid.uuid4, 
    editable=False
  )

  user_book = models.ForeignKey(
    UserBook,
    on_delete=models.CASCADE,
    related_name="reading_notes",
    help_text="User book to which this note belongs"
  )

  session = models.ForeignKey(
    ImmersionMode,
    on_delete=models.CASCADE,
    related_name="reading_notes",
    help_text="Session to which this note belongs"
  )

  page_number = models.IntegerField(
    null=True, 
    blank=True,
    help_text="Page number of the note"
  )

  content = models.TextField(
    null=True, 
    blank=True,
    help_text="Content of the note"
  )

  created_at = models.DateTimeField(
    auto_now_add=True,
    editable=False,
    help_text="Date when note was created"
  )


# ===================================================================


class Library(models.Model):
  """
  Represents a custom list or shelf of books curated by a user, with styling
  options like colors and optional public visibility.
  """
  id = models.UUIDField(
    primary_key=True, 
    default=uuid.uuid4, 
    editable=False
  )

  user_id = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="library",
    help_text="User to which this library belongs"
  )

  title = models.CharField(
    max_length=150,
    help_text="Title of the library"
  )

  description = models.TextField(
    null=True, 
    blank=True,
    help_text="Description of the library"
  )

  primary_color = models.CharField(
    max_length=7,
    default="#000000",
    help_text="Primary color of the library"
  )

  is_public = models.BooleanField(
    default=True,
    help_text="Whether the library is public"
  )

  books = models.ManyToManyField(
    Books,
    through='LibraryBook',
    related_name="libraries",
    help_text="Books in the library"
  )

  created_at = models.DateTimeField(
    auto_now_add=True,
    editable=False,
    help_text="Date when library was created"
  )

  updated_at = models.DateField(
    auto_now=True,
    help_text="Date when library was updated"
  )


# ===================================================================


class LibraryBook(models.Model):
  """
  A junction table that maps books to user libraries, tracking when each book
  was added to the library.
  """
  id = models.UUIDField(
    primary_key=True, 
    default=uuid.uuid4, 
    editable=False
  )

  book_id = models.ForeignKey(
    Books,
    on_delete=models.CASCADE,
    related_name="library_books",
    help_text="Book to which this library book belongs"
  )

  library_id = models.ForeignKey(
    Library,
    on_delete=models.CASCADE,
    related_name="library_books",
    help_text="Library to which this library book belongs"
  )

  added_at = models.DateTimeField(
    auto_now_add=True,
    editable=False,
    help_text="Date when book was added to the library"
  )

  class Meta:
    unique_together = ('book_id', 'library_id')

  def __str__(self):
    return f"{self.book_id.title}"
