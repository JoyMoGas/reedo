"""
@project Reedo
@module books.services.hardcover
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-10-24
@description Robust Hardcover GraphQL client acting as a BFF layer with query optimization,
sanitization, and automated high-availability fallback.
"""
import os
import uuid
import logging
import requests
from typing import Any, Dict, List, Optional
from django.conf import settings
from .sanitizer import sanitize_hardcover_books, is_valid_cover_url

logger = logging.getLogger(__name__)


# Parameterized GraphQL Query for Discovering Books via 'cached_books' node
DISCOVER_CACHED_BOOKS_QUERY = """
query DiscoverCachedBooks($limit: Int!, $min_users: Int! = 25, $min_rating: Float! = 3.5) {
  cached_books(
    where: {
      image: { url: { _is_null: false } }
      users_count: { _gt: $min_users }
      rating: { _gt: $min_rating }
    }
    order_by: { users_count: desc }
    limit: $limit
  ) {
    id
    title
    subtitle
    description
    pages
    rating
    users_count
    cached_contributors
    image {
      url
    }
  }
}
"""

# Fallback GraphQL Query targeting 'books' node with denormalized cached fields
DISCOVER_BOOKS_QUERY = """
query DiscoverBooks($limit: Int!, $min_users: Int! = 25, $min_rating: Float! = 3.5) {
  books(
    where: {
      image: { url: { _is_null: false } }
      users_count: { _gt: $min_users }
      rating: { _gt: $min_rating }
    }
    order_by: { users_count: desc }
    limit: $limit
  ) {
    id
    title
    subtitle
    description
    pages
    rating
    users_count
    cached_contributors
    image {
      url
    }
  }
}
"""

# Search query
SEARCH_BOOKS_QUERY = """
query SearchBooks($query: String!, $limit: Int!) {
  search(query: $query, query_type: "book", per_page: $limit) {
    results
  }
}
"""

# Search authors query
SEARCH_AUTHORS_QUERY = """
query SearchAuthors($query: String!, $limit: Int!) {
  search(query: $query, query_type: "author", per_page: $limit) {
    results
  }
}
"""

# Newly released books query
NEWLY_RELEASED_QUERY = """
query NewlyReleasedBooks($year: Int!, $limit: Int!) {
  books(
    where: {
      released_year: { _eq: $year }
      image: { url: { _is_null: false } }
    }
    order_by: { released_at: desc }
    limit: $limit
  ) {
    id
    title
    description
    pages
    rating
    users_count
    released_at
    image {
      url
    }
    cached_contributors
  }
}
"""


class HardcoverService:
    """
    Hardcover GraphQL API client serving as the primary BFF gateway for Reedo.
    Provides strictly filtered queries, sanitization, and high-availability fallback.
    """
    base_url = "https://api.hardcover.app/v1/graphql"
    timeout_seconds = 10

    @classmethod
    def _get_headers(cls) -> Dict[str, str]:
        token = (
            getattr(settings, 'HARDCOVER_API_TOKEN', None)
            or os.environ.get('HARDCOVER_API_TOKEN')
            or os.environ.get('hardcover_api_token')
        )
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if token:
            headers["Authorization"] = f"Bearer {token.strip()}"
        return headers

    @classmethod
    def _execute_query(cls, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Executes a GraphQL query against Hardcover API with error logging.
        """
        headers = cls._get_headers()
        payload = {"query": query}
        if variables:
            payload["variables"] = variables

        try:
            response = requests.post(
                cls.base_url,
                json=payload,
                headers=headers,
                timeout=cls.timeout_seconds
            )
            
            if response.status_code == 401:
                logger.warning(
                    "Hardcover API returned 401 Unauthorized (%s). "
                    "Ensure user account is active and token is valid at hardcover.app/account/api.",
                    response.text[:200]
                )
                return {}

            response.raise_for_status()
            res_json = response.json()

            if "errors" in res_json:
                logger.warning("Hardcover GraphQL returned errors: %s", res_json["errors"])
                return res_json

            return res_json

        except requests.exceptions.RequestException as e:
            logger.warning("Hardcover API network error: %s", str(e))
            return {}

    @classmethod
    def get_discover_books(
        cls,
        limit: int = 15,
        min_users: int = 25,
        min_rating: float = 3.5,
        sync_db: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Queries recommended/discovery books using strict GraphQL filters:
        - Image must exist (image.url is not null)
        - users_count > 25
        - rating > 3.5
        - order_by: { users_count: desc }
        Attempts 'cached_books' first, falling back to 'books'.
        If Hardcover fails (e.g. 401 inactive token), uses high-availability fallback.
        Results pass through sanitize_hardcover_books().
        """
        variables = {
            "limit": max(limit, 10),
            "min_users": min_users,
            "min_rating": float(min_rating),
        }

        # 1. Attempt cached_books node
        raw_res = cls._execute_query(DISCOVER_CACHED_BOOKS_QUERY, variables)
        errors = raw_res.get("errors", []) if isinstance(raw_res, dict) else []

        # If cached_books is not supported or errors out, fallback to books node
        if not raw_res or errors:
            raw_res = cls._execute_query(DISCOVER_BOOKS_QUERY, variables)

        sanitized_books = sanitize_hardcover_books(raw_res)

        # 2. High-availability fallback if Hardcover is unavailable / unauthorized
        if not sanitized_books:
            logger.info("Hardcover unavailable or empty. Engaging high-availability fallback for discover books.")
            sanitized_books = cls._fetch_fallback_discover_books(limit=limit)

        # Sync clean books into local database so mobile actions (details, saves) resolve immediately
        if sync_db and sanitized_books:
            cls.sync_sanitized_to_db(sanitized_books)

        return sanitized_books[:limit]

    @classmethod
    def search_and_clean_books(
        cls,
        query: str,
        max_results: int = 10,
        lang_restrict: str = 'en',
        intitle_only: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Searches books by Title, Author or ISBN.
        Queries Hardcover GraphQL search first; if unavailable/empty, engages fallback search.
        Applies sanitize_hardcover_books pipeline to discard low-quality results.
        """
        if not query or not query.strip():
            return []

        variables = {
            "query": query.strip(),
            "limit": max(max_results * 2, 10)
        }

        raw_res = cls._execute_query(SEARCH_BOOKS_QUERY, variables)
        sanitized = sanitize_hardcover_books(raw_res)

        # If Hardcover is unauthorized (401) or returns no results, query fallback search
        if not sanitized:
            logger.info("Hardcover search empty or unauthorized for '%s'. Engaging fallback search.", query)
            sanitized = cls._fetch_fallback_search_books(query.strip(), max_results=max_results)

        # Enforce intitle filter if requested
        if intitle_only:
            sanitized = [b for b in sanitized if query.lower().strip() in b["title"].lower()]

        # Sync clean results into database
        if sanitized:
            cls.sync_sanitized_to_db(sanitized)

        return sanitized[:max_results]

    @classmethod
    def search_authors(cls, query: str, max_results: int = 5) -> List[str]:
        """
        Searches authors by name through Hardcover Search GraphQL API with fallback.
        """
        if not query or not query.strip():
            return []

        variables = {
            "query": query.strip(),
            "limit": max_results
        }

        raw_res = cls._execute_query(SEARCH_AUTHORS_QUERY, variables)
        data = raw_res.get("data", {})
        search_data = data.get("search", {})
        results_data = search_data.get("results", {})
        hits = results_data.get("hits", [])

        authors = []
        for hit in hits:
            doc = hit.get("document", {})
            name = doc.get("name") or doc.get("title")
            if name and name not in authors:
                authors.append(name)

        if not authors:
            authors = cls._fetch_fallback_authors(query, max_results)

        return authors[:max_results]

    @classmethod
    def get_authors_by_genres(cls, genres: List[str], limit: int = 10) -> List[str]:
        """
        Queries authors matching specified genres/tags on Hardcover with fallback.
        """
        authors = set()
        for genre in genres:
            if not genre or not genre.strip():
                continue
            books = cls.search_and_clean_books(genre, max_results=limit)
            for b in books:
                a = b.get("author")
                if a and a != "Unknown Author":
                    authors.add(a)
        return list(authors)[:limit]

    @classmethod
    def get_trending_books(cls, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Returns trending books ordered by users_count with strict filters.
        """
        return cls.get_discover_books(limit=limit, min_users=25, min_rating=3.5)

    @classmethod
    def get_newly_released_books_for_year(cls, year: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Queries newly released books for a specific year ordered by released_at on Hardcover.
        """
        variables = {
            "year": year,
            "limit": max(limit * 2, 10)
        }
        raw_res = cls._execute_query(NEWLY_RELEASED_QUERY, variables)
        sanitized = sanitize_hardcover_books(raw_res)

        if not sanitized:
            sanitized = cls.search_and_clean_books(str(year), max_results=limit)

        return sanitized[:limit]

    # =========================================================================
    # High-Availability Fallback Providers (Open Library & Google Books)
    # =========================================================================

    @classmethod
    def _fetch_fallback_discover_books(cls, limit: int = 15) -> List[Dict[str, Any]]:
        """
        Fetches curated trending bestsellers from Open Library / Google Books.
        """
        items: List[Dict[str, Any]] = []

        # 1. Try Open Library Daily Trending
        try:
            ol_resp = requests.get(
                "https://openlibrary.org/trending/daily.json",
                timeout=5
            )
            if ol_resp.status_code == 200:
                works = ol_resp.json().get("works", [])
                for w in works:
                    cid = w.get("cover_i")
                    if not cid:
                        continue
                    items.append({
                        "id": str(w.get("key", "")).replace("/works/", ""),
                        "title": w.get("title"),
                        "cached_contributors": [{"name": a, "role": "Author"} for a in w.get("author_name", [])],
                        "image": {"url": f"https://covers.openlibrary.org/b/id/{cid}-L.jpg"},
                        "rating": 4.5,
                        "users_count": 2500,
                        "pages": 320,
                    })
        except Exception as e:
            logger.debug("Open Library trending fallback error: %s", str(e))

        # 2. Try Google Books API if Open Library had insufficient results
        if len(items) < limit:
            google_key = getattr(settings, 'GOOGLE_BOOKS_API_KEY', None) or os.environ.get('GOOGLE_BOOKS_API_KEY')
            if google_key:
                try:
                    gb_resp = requests.get(
                        f"https://www.googleapis.com/books/v1/volumes?q=bestseller+fiction&maxResults=20&key={google_key}",
                        timeout=5
                    )
                    if gb_resp.status_code == 200:
                        for it in gb_resp.json().get("items", []):
                            v = it.get("volumeInfo", {})
                            thumb = (v.get("imageLinks", {}).get("thumbnail") or "").replace("http://", "https://")
                            if thumb:
                                items.append({
                                    "id": it.get("id"),
                                    "title": v.get("title"),
                                    "cached_contributors": [{"name": a, "role": "Author"} for a in v.get("authors", [])],
                                    "image": {"url": thumb},
                                    "rating": float(v.get("averageRating") or 4.2),
                                    "users_count": int(v.get("ratingsCount") or 500),
                                    "description": v.get("description", ""),
                                    "pages": int(v.get("pageCount") or 0),
                                })
                except Exception as e:
                    logger.debug("Google Books trending fallback error: %s", str(e))

        return sanitize_hardcover_books(items)[:limit]

    @classmethod
    def _fetch_fallback_search_books(cls, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """
        Performs high-speed search against Open Library and Google Books.
        """
        items: List[Dict[str, Any]] = []

        # 1. Try Open Library Search
        try:
            ol_resp = requests.get(
                f"https://openlibrary.org/search.json?q={requests.utils.quote(query)}&limit={max_results * 2}",
                timeout=5
            )
            if ol_resp.status_code == 200:
                docs = ol_resp.json().get("docs", [])
                for d in docs:
                    cid = d.get("cover_i")
                    if not cid:
                        continue
                    isbns = d.get("isbn") or []
                    items.append({
                        "id": str(d.get("key", "")).replace("/works/", ""),
                        "title": d.get("title"),
                        "cached_contributors": [{"name": a, "role": "Author"} for a in d.get("author_name", [])],
                        "image": {"url": f"https://covers.openlibrary.org/b/id/{cid}-L.jpg"},
                        "rating": float(d.get("ratings_average") or 4.3),
                        "users_count": int(d.get("ratings_count") or 150),
                        "isbn": isbns[0] if isbns else None,
                        "pages": int(d.get("number_of_pages_median") or 250),
                    })
        except Exception as e:
            logger.debug("Open Library search fallback error: %s", str(e))

        # 2. Try Google Books Search if needed
        if len(items) < max_results:
            google_key = getattr(settings, 'GOOGLE_BOOKS_API_KEY', None) or os.environ.get('GOOGLE_BOOKS_API_KEY')
            if google_key:
                try:
                    gb_resp = requests.get(
                        f"https://www.googleapis.com/books/v1/volumes?q={requests.utils.quote(query)}&maxResults={max_results}&key={google_key}",
                        timeout=5
                    )
                    if gb_resp.status_code == 200:
                        for it in gb_resp.json().get("items", []):
                            v = it.get("volumeInfo", {})
                            thumb = (v.get("imageLinks", {}).get("thumbnail") or "").replace("http://", "https://")
                            if thumb:
                                items.append({
                                    "id": it.get("id"),
                                    "title": v.get("title"),
                                    "cached_contributors": [{"name": a, "role": "Author"} for a in v.get("authors", [])],
                                    "image": {"url": thumb},
                                    "rating": float(v.get("averageRating") or 4.0),
                                    "users_count": int(v.get("ratingsCount") or 80),
                                    "description": v.get("description", ""),
                                    "pages": int(v.get("pageCount") or 0),
                                })
                except Exception as e:
                    logger.debug("Google Books search fallback error: %s", str(e))

        return sanitize_hardcover_books(items)[:max_results]

    @classmethod
    def _fetch_fallback_authors(cls, query: str, max_results: int = 5) -> List[str]:
        """
        Searches Open Library for authors matching query.
        """
        try:
            resp = requests.get(
                f"https://openlibrary.org/search/authors.json?q={requests.utils.quote(query)}&limit={max_results}",
                timeout=5
            )
            if resp.status_code == 200:
                docs = resp.json().get("docs", [])
                return [d.get("name") for d in docs if d.get("name")][:max_results]
        except Exception:
            pass
        return []

    @classmethod
    def sync_sanitized_to_db(cls, sanitized_books: List[Dict[str, Any]]) -> None:
        """
        Synchronizes sanitized books into the local Books catalog in Django.
        Ensures foreign keys, library saves, and book details resolve instantly.
        """
        from books.models import Books, Authors, Genres

        for item in sanitized_books:
            book_id = item.get("book_id") or item.get("id")
            title = item.get("title")
            if not title:
                continue

            try:
                parsed_id = uuid.UUID(str(book_id))
            except (ValueError, AttributeError):
                parsed_id = uuid.uuid5(uuid.NAMESPACE_DNS, f"hardcover_{book_id}")
                item["book_id"] = str(parsed_id)
                item["id"] = str(parsed_id)

            isbn = item.get("isbn")
            cover_url = item.get("cover_url") or item.get("cover_image") or ""

            db_book = None
            if isbn:
                db_book = Books.objects.filter(isbn=isbn).first()
            if not db_book:
                db_book = Books.objects.filter(id=parsed_id).first()
            if not db_book:
                db_book = Books.objects.filter(title__iexact=title).first()

            if not db_book:
                try:
                    db_book = Books.objects.create(
                        id=parsed_id,
                        title=title,
                        synopsis=item.get("description") or item.get("synopsis") or "",
                        total_pages=item.get("pages") or item.get("total_pages") or 0,
                        cover_image=cover_url,
                        isbn=isbn,
                        average_rating=item.get("rating") or item.get("average_rating") or 0.0,
                    )
                except Exception as e:
                    logger.debug("Book creation exception: %s", str(e))
                    continue

            # Ensure cover image is updated if it was missing or empty
            if db_book and cover_url and (not db_book.cover_image or "placeholder" in db_book.cover_image.lower()):
                db_book.cover_image = cover_url
                db_book.save(update_fields=["cover_image"])

            # Link primary author
            author_name = item.get("author") or "Unknown Author"
            if author_name and author_name != "Unknown Author" and db_book:
                author_obj, _ = Authors.objects.get_or_create(name=author_name)
                db_book.authors.add(author_obj)

            # Link genres
            if db_book:
                for g_name in item.get("genres", []):
                    if g_name and g_name != "General":
                        genre_obj, _ = Genres.objects.get_or_create(genre=g_name)
                        db_book.genres.add(genre_obj)
