# ===================================================================
# Imports
# ===================================================================

import uuid
from django.db import models
from django.conf import settings
from books.models import Books


# ===================================================================
# Models
# ===================================================================


class Echo(models.Model):
  """
  Represents a social post created by a user, which can be a text update, 
  a photo, or a shared book with a caption.
  """
  id = models.UUIDField(
    primary_key=True,
    default=uuid.uuid4,
    editable=False
  )

  user_id = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="echoes",
    help_text="User who created the echo"
  )

  content = models.TextField(
    help_text="Text content of the echo"
  )

  shared_book = models.ForeignKey(
    Books,
    on_delete=models.SET_NULL,
    related_name="echoes",
    null=True,
    blank=True,
    help_text="Book being shared in the echo"
  )

  is_spoiler = models.BooleanField(
    default=False,
    help_text="Whether the post contains spoilers"
  )

  created_at = models.DateTimeField(
    auto_now_add=True,
    help_text="Date and time when the post was created"
  )

  updated_at = models.DateTimeField(
    auto_now=True,
    help_text="Date and time when the post was last updated"
  )

  def __str__(self):
    if self.shared_book:
      return f"@{self.user_id.username} shared {self.shared_book.title}"
    return f"@{self.user_id.username} posted on {self.created_at.date()}"


# ===================================================================


class Review(models.Model):
  """
  Represents a review written by a user for a book.
  """
  id = models.UUIDField(
    primary_key=True,
    default=uuid.uuid4,
    editable=False
  )

  user_id = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="reviews",
    help_text="User who wrote the review"
  )

  book_id = models.ForeignKey(
    Books,
    on_delete=models.CASCADE,
    related_name="reviews",
    help_text="Book being reviewed"
  )

  rating = models.IntegerField(
    help_text="Rating given by the user"
  )

  comment = models.TextField(
    help_text="Text content of the review"
  )

  is_spoiler = models.BooleanField(
    default=False,
    help_text="Whether the review contains spoilers"
  )

  created_at = models.DateTimeField(
    auto_now_add=True,
    help_text="Date and time when the review was created"
  )

  updated_at = models.DateTimeField(
    auto_now=True,
    help_text="Date and time when the review was last updated"
  )

  def __str__(self):
    return f"@{self.user_id.username} reviewed {self.book_id.title}"


# ===================================================================


class Comment(models.Model):
  """
  Represents a comment made by a user on a post or review.
  """
  id = models.UUIDField(
    primary_key=True,
    default=uuid.uuid4,
    editable=False
  )

  user_id = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="comments",
    help_text="User who made the comment"
  )

  echo_id = models.ForeignKey(
    Echo,
    on_delete=models.CASCADE,
    related_name="comments",
    help_text="Echo to which this comment belongs"
  )

  review_id = models.ForeignKey(
    Review,
    on_delete=models.CASCADE,
    related_name="comments",
    help_text="Review to which this comment belongs"
  )

  parent_comment_id = models.ForeignKey(
    "self",
    on_delete=models.CASCADE,
    related_name="comments",
    null=True,
    blank=True,
    help_text="Parent comment to which this comment belongs"
  )

  content = models.TextField(
    help_text="Text content of the comment"
  )

  is_spoiler = models.BooleanField(
    default=False,
    help_text="Whether the comment contains spoilers"
  )

  created_at = models.DateTimeField(
    auto_now_add=True,
    help_text="Date and time when the comment was created"
  )

  updated_at = models.DateTimeField(
    auto_now=True,
    help_text="Date and time when the comment was last updated"
  )

  def __str__(self):
    return f"@{self.user_id.username} commented on {self.echo_id}"


# ===================================================================


class Reaction(models.Model):
  """
  Represents a reaction made by a user on a post or review.
  """
  id = models.UUIDField(
    primary_key=True,
    default=uuid.uuid4,
    editable=False
  )

  user_id = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="reactions",
    help_text="User who made the reaction"
  )

  echo_id = models.ForeignKey(
    Echo,
    on_delete=models.CASCADE,
    related_name="reactions",
    help_text="Echo to which this reaction belongs"
  )

  review_id = models.ForeignKey(
    Review,
    on_delete=models.CASCADE,
    related_name="reactions",
    help_text="Review to which this reaction belongs"
  )

  comment_id = models.ForeignKey(
    Comment,
    on_delete=models.CASCADE,
    related_name="reactions",
    help_text="Comment to which this reaction belongs"
  )

  reaction = models.CharField(
    max_length=50,
    default='LIKE',
    help_text="Reaction made by the user"
  )

  created_at = models.DateTimeField(
    auto_now_add=True,
    help_text="Date and time when the reaction was created"
  )

  updated_at = models.DateTimeField(
    auto_now=True,
    help_text="Date and time when the reaction was last updated"
  )

  def __str__(self):
    return f"@{self.user_id.username} reacted to {self.echo_id}"


# ===================================================================


class Follow(models.Model):
  """
  Represents a follow relationship between two users.
  """
  id = models.UUIDField(
    primary_key=True,
    default=uuid.uuid4,
    editable=False
  )

  follower_id = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="followers",
    help_text="User who is following"
  )

  followed_id = models.ForeignKey(
    settings.AUTH_USER_MODEL,
    on_delete=models.CASCADE,
    related_name="following",
    help_text="User who is being followed"
  )

  created_at = models.DateTimeField(
    auto_now_add=True,
    help_text="Date and time when the follow was created"
  )

  class Meta:
    unique_together = ('follower_id', 'followed_id')

  def __str__(self):
    return f"@{self.follower_id.username} followed {self.followed_id}"