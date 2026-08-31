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
from .models import Echo, Review, Comment, Reaction, Follow

# ===================================================================
# Register models to admin site
# ===================================================================

admin.site.register(Echo)
admin.site.register(Review)
admin.site.register(Comment)
admin.site.register(Reaction)
admin.site.register(Follow)
