"""
@project Reedo
@module books.services.sanitizer
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-10-24
@description Data sanitization, filtering, and normalization pipeline for Hardcover GraphQL responses.
"""
import json
import uuid
import logging
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

# Case-insensitive title keywords to discard low-quality / compilation / reference items
BLACKLIST_TITLE_KEYWORDS = [
    "box set",
    "boxset",
    "collection",
    "complete series",
    "dictionary",
    "companion",
    "summary of",
    "study guide",
    "encyclopedia",
    "the complete works",
    "omnibus",
    "workbook",
    "sparknotes",
    "cliffnotes",
]

# Patterns in image URLs that indicate missing covers, default avatars or placeholders
DISCARDED_IMAGE_PATTERNS = [
    "placeholder",
    "no-cover",
    "nocover",
    "default_avatar",
    "author_avatar",
    "avatar",
    "missing",
    "blank",
    "empty",
]


def is_valid_cover_url(url: Optional[str]) -> bool:
    """
    Validates that a cover URL is non-empty, uses HTTP(S), and is not a placeholder or author avatar.
    """
    if not url or not isinstance(url, str):
        return False
    
    clean_url = url.strip()
    if not clean_url or not clean_url.startswith(("http://", "https://")):
        return False

    lower_url = clean_url.lower()
    for pattern in DISCARDED_IMAGE_PATTERNS:
        if pattern in lower_url:
            return False

    return True


def is_blacklisted_title(title: Optional[str]) -> bool:
    """
    Checks if a title contains any blacklisted keywords (case-insensitive).
    """
    if not title or not isinstance(title, str):
        return True

    lower_title = title.lower()
    for keyword in BLACKLIST_TITLE_KEYWORDS:
        if keyword in lower_title:
            return True

    return False


def extract_primary_author(
    cached_contributors: Any,
    fallback_contributions: Any = None
) -> str:
    """
    Extracts and flattens the primary author from cached_contributors or fallback fields.
    Handles varied Hardcover formats:
    - List of dicts with role and name (e.g. [{"name": "...", "role": "Author"}])
    - Nested contributor structures (e.g. [{"author": {"name": "..."}}])
    - JSON-encoded strings
    - List of plain author strings
    Defaults safely to 'Unknown Author'.
    """
    contributors = cached_contributors
    if not contributors and fallback_contributions:
        contributors = fallback_contributions

    if isinstance(contributors, str):
        try:
            contributors = json.loads(contributors)
        except Exception:
            clean_str = contributors.strip()
            return clean_str if clean_str else "Unknown Author"

    if isinstance(contributors, list) and len(contributors) > 0:
        # First priority: find someone explicitly tagged as Author, Writer, or Creator
        for item in contributors:
            if isinstance(item, dict):
                role = str(item.get("role", "")).lower()
                name = item.get("name") or (
                    item.get("author", {}).get("name")
                    if isinstance(item.get("author"), dict) else None
                )
                if name and role in ("author", "writer", "creator"):
                    return str(name).strip()
            elif isinstance(item, str) and item.strip():
                return item.strip()

        # Second priority: pick the first contributor with a valid non-empty name
        for item in contributors:
            if isinstance(item, dict):
                name = item.get("name") or (
                    item.get("author", {}).get("name")
                    if isinstance(item.get("author"), dict) else None
                )
                if name and str(name).strip():
                    return str(name).strip()
            elif isinstance(item, str) and item.strip():
                return item.strip()

    elif isinstance(contributors, dict):
        name = contributors.get("name") or (
            contributors.get("author", {}).get("name")
            if isinstance(contributors.get("author"), dict) else None
        )
        if name and str(name).strip():
            return str(name).strip()

    return "Unknown Author"


def sanitize_hardcover_books(raw_data: Union[dict, list]) -> List[Dict[str, Any]]:
    """
    Sanitizes raw book data returned from Hardcover GraphQL API:
    - Filters out items without valid cover image (null, empty, or 'placeholder').
    - Discards blacklisted titles (box sets, collections, dictionaries, companions, etc.).
    - Extracts and flattens primary author from cached_contributors.
    - Formats payload with frontend keys:
      book_id, title, author, cover_url, rating, shelved_count.
    - Also includes backwards-compatible aliases for existing Reedo mobile components:
      id, authors, cover_image, average_rating, added_count, description, synopsis, genres, total_pages.
    """
    items = []
    if isinstance(raw_data, dict):
        data_block = raw_data.get("data", raw_data)
        if "cached_books" in data_block and isinstance(data_block["cached_books"], list):
            items = data_block["cached_books"]
        elif "books" in data_block and isinstance(data_block["books"], list):
            items = data_block["books"]
        elif "works" in data_block and isinstance(data_block["works"], list):
            items = data_block["works"]
        elif "search" in data_block:
            search_res = data_block.get("search", {}).get("results", {})
            items = [hit.get("document", {}) for hit in search_res.get("hits", [])]
        elif "results" in data_block and isinstance(data_block["results"], list):
            items = data_block["results"]
        else:
            for val in data_block.values():
                if isinstance(val, list):
                    items = val
                    break
    elif isinstance(raw_data, list):
        items = raw_data

    sanitized: List[Dict[str, Any]] = []
    seen_titles = set()
    seen_ids = set()

    for item in items:
        if not isinstance(item, dict):
            continue

        title = item.get("title")
        if not title or not isinstance(title, str) or not title.strip():
            continue
        title = title.strip()

        # 1. Filter out titles containing blacklisted terms
        if is_blacklisted_title(title):
            continue

        # Prevent duplicate titles within the same sanitized batch
        title_norm = title.lower()
        if title_norm in seen_titles:
            continue

        # 2. Extract and validate cover image URL
        image_obj = item.get("image")
        cover_url = ""
        if isinstance(image_obj, dict):
            cover_url = image_obj.get("url") or ""
        elif isinstance(image_obj, str):
            cover_url = image_obj
        elif "cover_url" in item:
            cover_url = item.get("cover_url") or ""
        elif "cover_image" in item:
            cover_url = item.get("cover_image") or ""

        if not is_valid_cover_url(cover_url):
            continue

        # 3. Extract primary author from cached_contributors or fallback
        author = extract_primary_author(
            item.get("cached_contributors"),
            fallback_contributions=item.get("contributions") or item.get("author_names")
        )

        # 4. Extract and normalize average rating
        raw_rating = item.get("rating")
        if raw_rating is None:
            raw_rating = item.get("rating_average") or item.get("average_rating") or 0.0
        try:
            rating = round(float(raw_rating or 0.0), 2)
        except (ValueError, TypeError):
            rating = 0.0

        # 5. Extract and normalize shelved / user count
        raw_users_count = item.get("users_count")
        if raw_users_count is None:
            raw_users_count = item.get("ratings_count") or item.get("shelved_count") or item.get("added_count") or 0
        try:
            shelved_count = int(raw_users_count or 0)
        except (ValueError, TypeError):
            shelved_count = 0

        # Generate or format deterministic ID
        raw_id = item.get("id") or item.get("book_id")
        if raw_id:
            try:
                # Validate if it's already a valid UUID string
                book_id = str(uuid.UUID(str(raw_id)))
            except (ValueError, AttributeError):
                # Deterministically convert Hardcover integer ID to a valid UUIDv5
                book_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"hardcover_{raw_id}"))
        else:
            book_id = str(uuid.uuid4())

        if book_id in seen_ids:
            continue

        seen_titles.add(title_norm)
        seen_ids.add(book_id)

        # Extract genres/categories safely
        raw_tags = item.get("cached_tags") or item.get("book_tags") or item.get("genres") or item.get("categories") or []
        genres: List[str] = []
        if isinstance(raw_tags, list):
            for t in raw_tags:
                if isinstance(t, dict):
                    tag_name = t.get("tag", {}).get("name") if isinstance(t.get("tag"), dict) else t.get("name")
                    if tag_name:
                        genres.append(str(tag_name).strip())
                elif isinstance(t, str) and t.strip():
                    genres.append(t.strip())
        if not genres:
            genres = ["General"]

        description = item.get("description") or item.get("synopsis") or ""
        pages = item.get("pages") or item.get("page_count") or item.get("total_pages") or 0
        try:
            pages = int(pages or 0)
        except (ValueError, TypeError):
            pages = 0

        sanitized_book = {
            # Required specifications
            "book_id": book_id,
            "title": title,
            "author": author,
            "cover_url": cover_url,
            "rating": rating,
            "shelved_count": shelved_count,

            # Backwards compatibility with existing Reedo mobile components
            "id": book_id,
            "authors": [author],
            "cover_image": cover_url,
            "average_rating": rating,
            "added_count": shelved_count,
            "description": description,
            "synopsis": description,
            "pages": pages,
            "total_pages": pages,
            "genres": genres,
            "categories": genres,
            "isbn": item.get("isbn") or (item.get("isbns", [None])[0] if isinstance(item.get("isbns"), list) and item.get("isbns") else None),
            "published_date": item.get("release_date") or item.get("released_at") or item.get("published_date"),
        }
        sanitized.append(sanitized_book)

    return sanitized
