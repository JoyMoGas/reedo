from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from django.db.models import Q

class EmailOrUsernameModelBackend(ModelBackend):
  """
  Custom authentication backend to allow logging in with either
  username or email address (case-insensitive) globally in Django.
  """
  def authenticate(self, request, username=None, password=None, **kwargs):
    UserModel = get_user_model()
    if username is None:
      username = kwargs.get(UserModel.USERNAME_FIELD)
    
    try:
      # Perform a case-insensitive query for both username and email
      user = UserModel.objects.filter(
        Q(username__iexact=username) | Q(email__iexact=username)
      ).first()
    except Exception:
      return None

    if user and user.check_password(password):
      return user
    return None
