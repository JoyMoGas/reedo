server:
	call cd backend && .venv\Scripts\activate && py manage.py runserver	0.0.0.0:8000

android:
	call cd mobile && pnpm expo start -c

emulator:
	call cd mobile && pnpm expo start --android -c
