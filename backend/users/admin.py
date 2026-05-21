from django.contrib import admin

from .models import User, Streak, Badge, UserBadge

admin.site.register(User)
admin.site.register(Streak)
admin.site.register(Badge)
admin.site.register(UserBadge)

# Register your models here.
