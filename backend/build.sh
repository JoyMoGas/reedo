"""
@project Reedo
@module build
@author José Antonio Montaño (Lead Developer)
@date 2026-09-05
"""
#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit  # Salir si cualquier comando falla

pip install -r requirements.txt
python manage.py collectstatic --noinput
python manage.py migrate
