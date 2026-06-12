# ===================================================================
# Imports
# ===================================================================

from django.contrib.auth import authenticate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import UserSerializer, SignUpSerializer


# ===================================================================
# Views
# ===================================================================


def get_auth_for_user(user):
  rokens = RefreshToken.for_user(user)
  return {
    'user': UserSerializer(user).data,
    'tokens': {
      'refresh': str(rokens),
      'access': str(rokens.access_token),
    },
  }



class SignInView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if username:
      username = username.lower().strip()

    print("SignIn: ", username)

    if not username or not password:
      return Response({
        'error': 'Username and password are required',
      }, status=400)

    user = authenticate(username=username, password=password)

    if not user:
      return Response({
        'error': 'Invalid credentials',
      }, status=401)

    user_data = get_auth_for_user(user)

    return Response(user_data, status=200)

class SignUpView(APIView):
  permission_classes = [AllowAny]
  
  def post(self, request):
    print("SignUp: ", request.data)

    new_user = SignUpSerializer(data=request.data)
    new_user.is_valid(raise_exception=True)
    user = new_user.save()

    user_data = get_auth_for_user(user)

    return Response(user_data, status=201)

class CheckUsernameView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    username = request.data.get('username', '').strip().lower()
    
    if not username:
      return Response({'error': 'Username is required'}, status=400)
    
    exists = User.objects.filter(username__iexact=username).exists()
    return Response({'exists': exists}, status=200)

class CheckEmailView(APIView):
  permission_classes = [AllowAny]

  def post(self, request):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    email = request.data.get('email', '').strip().lower()
    
    if not email:
      return Response({'error': 'Email is required'}, status=400)
    
    exists = User.objects.filter(email__iexact=email).exists()
    return Response({'exists': exists}, status=200)