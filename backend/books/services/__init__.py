"""
@project Reedo
@module books.services
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-10-24
"""
from .hardcover import HardcoverService
from .sanitizer import (
    sanitize_hardcover_books,
    is_valid_cover_url,
    is_blacklisted_title,
    extract_primary_author,
    BLACKLIST_TITLE_KEYWORDS,
    DISCARDED_IMAGE_PATTERNS
)

__all__ = [
    "HardcoverService",
    "sanitize_hardcover_books",
    "is_valid_cover_url",
    "is_blacklisted_title",
    "extract_primary_author",
    "BLACKLIST_TITLE_KEYWORDS",
    "DISCARDED_IMAGE_PATTERNS",
]
