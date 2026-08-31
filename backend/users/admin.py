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
from .models import User, Streak, Badge, UserBadge

# ===================================================================
# Register models to admin site
# ===================================================================

admin.site.register(User)
admin.site.register(Streak)
admin.site.register(Badge)
admin.site.register(UserBadge)
