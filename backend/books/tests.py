"""
@project Reedo
@module tests
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-05-21
"""
import uuid
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Books, UserBook

User = get_user_model()


class UserBookAPITest(APITestCase):
    def setUp(self):
        # 1. Crear usuario de prueba y autenticar la sesión
        self.user = User.objects.create_user(
            username="lector_prueba",
            email="lector@reedo.com",
            password="password123"
        )
        self.client.force_authenticate(user=self.user)

        # 2. Crear un libro en la base de datos con ID válido (UUID)
        self.book = Books.objects.create(
            title="La sombra del viento",
            total_pages=200
        )

    def test_calcular_porcentaje_lectura(self):
        """
        Verifica que al guardar un libro con páginas leídas,
        el porcentaje de avance se calcule correctamente (50 / 200 = 25%).
        """
        payload = {
            "book_id": str(self.book.id),
            "current_page": 50,
            "status": "CURRENTLY_READING"
        }
        response = self.client.post("/api/books/userbook/", payload)

        # El endpoint responde 200 OK
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Validamos que en la base de datos se calculó y guardó 25.0%
        user_book = UserBook.objects.get(user_id=self.user, book_id=self.book)
        self.assertEqual(user_book.current_page, 50)
        self.assertEqual(user_book.progress_percentage, 25.0)
        self.assertEqual(user_book.status, "CURRENTLY_READING")

    def test_actualizar_progreso_con_patch(self):
        """
        Verifica que el método PATCH actualice el avance y recalcule
        el porcentaje (150 / 200 = 75%), devolviendo los datos actualizados.
        """
        # Crear la entrada inicial en la biblioteca
        UserBook.objects.create(
            user_id=self.user,
            book_id=self.book,
            status="CURRENTLY_READING",
            current_page=50,
            progress_percentage=25.0
        )

        patch_payload = {
            "book_id": str(self.book.id),
            "current_page": 150,
            "session_seconds": 1800  # 30 minutos de lectura
        }
        response = self.client.patch("/api/books/userbook/", patch_payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("current_page"), 150)
        self.assertEqual(response.data.get("progress_percentage"), 75.0)
        self.assertEqual(response.data.get("reading_time_seconds"), 1800)

    def test_listar_libros_de_usuario_get(self):
        """
        Verifica que GET /api/books/userbook/ devuelva los libros del usuario
        con su porcentaje de progreso y datos de catálogo.
        """
        UserBook.objects.create(
            user_id=self.user,
            book_id=self.book,
            status="CURRENTLY_READING",
            current_page=100,
            progress_percentage=50.0
        )

        response = self.client.get("/api/books/userbook/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "La sombra del viento")
        self.assertEqual(response.data[0]["progress_percentage"], 50.0)

    def test_eliminar_libro_de_biblioteca_delete(self):
        """
        Verifica que DELETE /api/books/userbook/ elimine el libro de la biblioteca del usuario.
        """
        UserBook.objects.create(
            user_id=self.user,
            book_id=self.book,
            status="READ_LATER"
        )

        response = self.client.delete("/api/books/userbook/", {"book_id": str(self.book.id)})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(UserBook.objects.filter(user_id=self.user, book_id=self.book).exists())

    def test_status_invalido_devuelve_400(self):
        """
        Verifica que enviar un status no permitido retorne HTTP 400 Bad Request.
        """
        payload = {
            "book_id": str(self.book.id),
            "status": "STATUS_INEXISTENTE"
        }
        response = self.client.post("/api/books/userbook/", payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_usuario_no_autenticado_retorna_401(self):
        """
        Verifica que peticiones no autenticadas sean rechazadas con HTTP 401 Unauthorized.
        """
        self.client.logout()
        response = self.client.get("/api/books/userbook/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)