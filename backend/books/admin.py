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

