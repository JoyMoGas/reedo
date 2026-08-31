"""
@project Reedo
@module admin
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-05-21
"""
# ===================================================================
# Imports
# ===================================================================


from django.contrib import admin
from .models import Books, UserBook, ImmersionMode, ReadingNote, Library, LibraryBook, Authors, Genres

# ===================================================================
# Register models to admin site
# ===================================================================

admin.site.register(Books)
admin.site.register(UserBook)
admin.site.register(ImmersionMode)
admin.site.register(ReadingNote)
admin.site.register(Library)
admin.site.register(LibraryBook)
admin.site.register(Authors)
admin.site.register(Genres)

