from django.contrib import admin

from .models import Books, UserBook, ImmersionMode, ReadingNote, Library

admin.site.register(Books)
admin.site.register(UserBook)
admin.site.register(ImmersionMode)
admin.site.register(ReadingNote)
admin.site.register(Library)


# Register your models here.
