server:
	call cd backend && .venv\Scripts\activate && py manage.py runserver	0.0.0.0:8000

android:
	cmd /c "nvm use 22" && cd mobile && pnpm expo start -c

emulator:
	cmd /c "nvm use 22" && cd mobile && pnpm expo start --android -c
