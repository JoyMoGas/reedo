# ===================================================================
# Imports
# ===================================================================

import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


# ===================================================================


def upload_thumbnail(instance, filename):
    path = f'thumbnails/{instance.username}'
    extension = filename.split('.')[-1]
    if extension:
        path = path + '.' + extension
    return path


# ===================================================================
# Models
# ===================================================================


class User(AbstractUser):
  """
  Custom user model extending Django's AbstractUser to include additional profile
  details like birth date, bio, location, favorite genres/authors, and leaderboard points.
  """
  id = models.UUIDField(
    primary_key=True, 
    default=uuid.uuid4, 
    editable=False
  )

  thumbnail = models.ImageField(
    upload_to=upload_thumbnail,
    null=True,
    blank=True,
    help_text="Profile picture of the user"
  )

  full_name = models.CharField(
    max_length=255,
    null=True,
    blank=True,
    help_text="Full name of the user"
  )

  first_name = None
  last_name = None

  birth_date = models.DateField(
    null=True, 
    blank=True,
    help_text="Date of birth of the user"
  )

  bio = models.TextField(
    null=True, 
    blank=True,
    help_text="Biography of the user"
  )

  city_residence = models.CharField(
    max_length=150,
    null=True, 
    blank=True,
    help_text="City of residence of the user"
  )

  honor_points = models.IntegerField(
    default=0,
    editable=False,
    help_text="Total points for LeaderBoard ranking"
  )

  streak_days = models.IntegerField(
    default=0,
    help_text="Current consecutive days of activity"
  )

  show_spoilers = models.BooleanField(
    default=True,
    help_text="Show spoilers in content recommendations"
  )

  member_since = models.DateField(
    auto_now_add=True,
    editable=False,
    help_text="Date when user joined"
  )

  favorite_genres = models.ManyToManyField(
    "books.Genres",
    blank=True,
    related_name="user_favorite_genres",
    help_text="Preferred genres for content recommendations"
  )

  favorite_authors = models.ManyToManyField(
    "books.Authors",
    blank=True,
    related_name="user_favorite_authors",
    help_text="Preferred authors for content recommendations"
  )

  def __str__(self):
    return f"@{self.username}"

# ===================================================================


class Streak(models.Model):
  """
  Tracks a user's daily reading activity, recording current consecutive days of activity,
  best streak, and activation dates.
  """
  id = models.UUIDField(
    primary_key=True, 
    default=uuid.uuid4, 
    editable=False
  )

  user_id = models.ForeignKey(
    User,
    on_delete=models.CASCADE,
    related_name="streaks",
    help_text="User to which this streak belongs"
  )

  current_streak = models.IntegerField(
    default=0,
    editable=False,
    help_text="Current consecutive days of activity"
  )

  best_streak = models.IntegerField(
    default=0,
    editable=False,
    help_text="Best streak achieved so far"
  )

  last_activity = models.DateField(
    auto_now_add=True,
    editable=False,
    help_text="Last day of activity"
  )

  activate_at = models.DateField(
    null=True,
    editable=False,
    help_text="Is activated formally on the 3rd consecutive day of activity"
  )

  def __str__(self):
    return f"{self.user_id.username} - Streak: {self.current_streak}"


# ===================================================================


class Badge(models.Model):
  """
  Represents badges or achievements that can be earned in the system
  (e.g., streak-based, objective-based, or special events).
  """
  CATEGORY_CHOICES = [
    ('STREAK', 'Streak-based'),
    ('OBJECTIVE', 'Objective-based'),
    ('SPECIAL', 'Special Event'),
  ]

  id = models.UUIDField(
    primary_key=True,
    default=uuid.uuid4,
    editable=False
  )

  user_id = models.ForeignKey(
    User,
    on_delete=models.CASCADE,
    related_name="badges",
    help_text="User to which this badge belongs"
  )

  title = models.CharField(
    max_length=100,
    help_text="Badge name"
  )

  description = models.TextField(
    null=True,
    blank=True,
    help_text="Description of the badge"
  )

  category = models.CharField(
    max_length=50,
    choices=CATEGORY_CHOICES,
    help_text="Category of the badge"
  )

  image = models.ImageField(
    upload_to='badges/',
    null=True,
    blank=True,
    help_text="Badge image"
  )

  icon = models.CharField(
    max_length=50,
    null=True,
    blank=True,
    help_text="Badge icon"
  )

  is_active = models.BooleanField(
    default=True,
    help_text="Whether the badge is active"
  )

  earned_at = models.DateField(
    auto_now_add=True,
    editable=False,
    help_text="Date when badge was earned"
  )

  def __str__(self):
    return f"{self.title}"


# ===================================================================


class UserBadge(models.Model):
  """
  Junction model linking users to their earned badges, with options to set
  badges as active or pinned on their public profile.
  """
  id = models.UUIDField(
    primary_key=True,
    default=uuid.uuid4,
    editable=False
  )

  user_id = models.ForeignKey(
    User,
    on_delete=models.CASCADE,
    related_name="user_badges",
    help_text="User to which this badge belongs"
  )

  badge_id = models.ForeignKey(
    Badge,
    on_delete=models.CASCADE,
    related_name="user_badges",
    help_text="Badge to which this user belongs"
  )

  is_active = models.BooleanField(
    default=True,
    help_text="Whether the badge is active"
  )

  is_pinned_on_profile = models.BooleanField(
    default=False,
    help_text="Whether the badge is pinned on the user's profile"
  )

  earned_at = models.DateField(
    auto_now_add=True,
    editable=False,
    help_text="Date when badge was earned"
  )

  class Meta:
    unique_together = ('user_id', 'badge_id')

  def __str__(self):
    return f"{self.badge_id.title}"