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
