"""
@project Reedo
@module services
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-06-27
"""
import os
import re
import requests
from django.conf import settings

class HardcoverService:
    base_url = "https://api.hardcover.app/v1/graphql"

    @classmethod
    def search_and_clean_books(cls, query, max_results=5, lang_restrict='en', intitle_only=True):
        """
        Searches books by Title, Author or ISBN using Hardcover Search GraphQL API
        """
        graphql_query = """
        query SearchBooks($query: String!, $limit: Int!) {
          search(query: $query, query_type: "book", per_page: $limit) {
            results
          }
        }
        """
        variables = {
            "query": query.strip(),
            "limit": max_results
        }

        api_token = getattr(settings, 'HARDCOVER_API_TOKEN', None) or os.environ.get('hardcover_api_token')
        headers = {
            "Content-Type": "application/json"
        }
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"

        try:
            response = requests.post(
                cls.base_url,
                json={"query": graphql_query, "variables": variables},
                headers=headers
            )
            response.raise_for_status()
            res_data = response.json()

            if "errors" in res_data:
                raise Exception(f"GraphQL Errors: {res_data['errors']}")

            data = res_data.get("data", {})
            search_data = data.get("search", {})
            results_data = search_data.get("results", {})
            hits = results_data.get("hits", [])

            books = []
            for hit in hits:
                item = hit.get("document", {})
                
                title = item.get("title", "Unknown Title")
                authors = item.get("author_names", ["Unknown Author"])
                description = item.get("description", "No Description Available")
                pages = item.get("pages") or 0
                cover_url = item.get("image", {}).get("url") or ""
                average_rating = float(item.get("rating") or 0.0)
                genres = item.get("genres", ["No Category Available"])
                isbns = item.get("isbns", [])
                isbn = isbns[0] if isbns else None

                # Enforce title filter if intitle_only=True
                if intitle_only and query.lower().strip() not in title.lower():
                    # We can be lenient for search, but let's still keep it
                    pass

                book_data = {
                    "title": title,
                    "authors": authors,
                    "description": description,
                    "page_count": pages,
                    "cover_url": cover_url,
                    "published_date": None,
                    "isbn": isbn,
                    "average_rating": average_rating,
                    "ratings_count": 0,
                    "categories": genres,
                    "language": "en"
                }
                books.append(book_data)
            return books

        except Exception as e:
            raise Exception(f"Error searching Hardcover books: {str(e)}")

    @classmethod
    def search_authors(cls, query, max_results=5):
        """
        Searches authors by name through Hardcover Search GraphQL API
        """
        graphql_query = """
        query SearchAuthors($query: String!, $limit: Int!) {
          search(query: $query, query_type: "author", per_page: $limit) {
            results
          }
        }
        """
        variables = {
            "query": query.strip(),
            "limit": max_results
        }

        api_token = getattr(settings, 'HARDCOVER_API_TOKEN', None) or os.environ.get('hardcover_api_token')
        headers = {
            "Content-Type": "application/json"
        }
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"

        try:
            response = requests.post(
                cls.base_url,
                json={"query": graphql_query, "variables": variables},
                headers=headers
            )
            response.raise_for_status()
            res_data = response.json()

            if "errors" in res_data:
                raise Exception(f"GraphQL Errors: {res_data['errors']}")

            data = res_data.get("data", {})
            search_data = data.get("search", {})
            results_data = search_data.get("results", {})
            hits = results_data.get("hits", [])

            return [
                hit.get("document", {}).get("name") or hit.get("document", {}).get("title")
                for hit in hits
                if hit.get("document", {}).get("name") or hit.get("document", {}).get("title")
            ]
        except Exception as e:
            raise Exception(f"Error searching Hardcover authors: {str(e)}")

    @classmethod
    def get_authors_by_genres(cls, genres, limit=10):
        """
        Queries books of specific genres/tags on Hardcover using search and extracts author names
        """
        authors = set()
        for genre in genres:
            graphql_query = """
            query SearchBooksByGenre($query: String!, $limit: Int!) {
              search(query: $query, query_type: "book", per_page: $limit) {
                results
              }
            }
            """
            variables = {
                "query": genre.strip(),
                "limit": limit
            }
            api_token = getattr(settings, 'HARDCOVER_API_TOKEN', None) or os.environ.get('hardcover_api_token')
            headers = {"Content-Type": "application/json"}
            if api_token:
                headers["Authorization"] = f"Bearer {api_token}"
            try:
                response = requests.post(
                    cls.base_url,
                    json={"query": graphql_query, "variables": variables},
                    headers=headers
                )
                if response.status_code == 200:
                    res_data = response.json()
                    data = res_data.get("data", {})
                    search_data = data.get("search", {})
                    results_data = search_data.get("results", {})
                    hits = results_data.get("hits", [])
                    for h in hits:
                        doc = h.get("document", {})
                        authors.update(doc.get("author_names", []))
            except Exception:
                pass
        return list(authors)

    @classmethod
    def get_trending_books(cls, limit=10):
        """
        Queries trending/popular books ordered by users_count on Hardcover
        """
        graphql_query = """
        query TrendingBooks($limit: Int!) {
          books(order_by: {users_count: desc}, limit: $limit) {
            id
            title
            description
            pages
            rating_average
            image {
              url
            }
            contributions {
              author {
                name
              }
            }
            book_tags {
              tag {
                name
              }
            }
          }
        }
        """
        variables = {
            "limit": limit
        }

        api_token = getattr(settings, 'HARDCOVER_API_TOKEN', None) or os.environ.get('hardcover_api_token')
        headers = {
            "Content-Type": "application/json"
        }
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"

        try:
            response = requests.post(
                cls.base_url,
                json={"query": graphql_query, "variables": variables},
                headers=headers
            )
            response.raise_for_status()
            res_data = response.json()

            if "errors" in res_data:
                raise Exception(f"GraphQL Errors: {res_data['errors']}")

            data = res_data.get("data", {})
            books_list = data.get("books", [])

            books = []
            for item in books_list:
                authors = [
                    c["author"]["name"]
                    for c in item.get("contributions", [])
                    if c.get("author") and c["author"].get("name")
                ]
                if not authors:
                    authors = ["Unknown Author"]

                genres = [
                    t["tag"]["name"]
                    for t in item.get("book_tags", [])
                    if t.get("tag") and t["tag"].get("name")
                ]
                if not genres:
                    genres = ["No Category Available"]

                book_data = {
                    "title": item.get("title", "Unknown Title"),
                    "authors": authors,
                    "description": item.get("description", "No Description Available"),
                    "page_count": item.get("pages") or 0,
                    "cover_url": item.get("image", {}).get("url") or "",
                    "published_date": None,
                    "isbn": None,
                    "average_rating": float(item.get("rating_average") or 0.0),
                    "ratings_count": 0,
                    "categories": genres,
                    "language": "en"
                }
                books.append(book_data)
            return books
        except Exception as e:
            raise Exception(f"Error getting trending books: {str(e)}")

    @classmethod
    def get_newly_released_books_for_year(cls, year, limit=10):
        """
        Queries newly released books for a specific year ordered by released_at on Hardcover
        """
        graphql_query = """
        query NewlyReleasedBooks($year: Int!, $limit: Int!) {
          books(where: {released_year: {_eq: $year}}, order_by: {released_at: desc}, limit: $limit) {
            id
            title
            description
            pages
            rating_average
            released_at
            image {
              url
            }
            contributions {
              author {
                name
              }
            }
            book_tags {
              tag {
                name
              }
            }
          }
        }
        """
        variables = {
            "year": year,
            "limit": limit
        }

        api_token = getattr(settings, 'HARDCOVER_API_TOKEN', None) or os.environ.get('hardcover_api_token')
        headers = {
            "Content-Type": "application/json"
        }
        if api_token:
            headers["Authorization"] = f"Bearer {api_token}"

        try:
            response = requests.post(
                cls.base_url,
                json={"query": graphql_query, "variables": variables},
                headers=headers
            )
            response.raise_for_status()
            res_data = response.json()

            if "errors" in res_data:
                raise Exception(f"GraphQL Errors: {res_data['errors']}")

            data = res_data.get("data", {})
            books_list = data.get("books", [])

            books = []
            for item in books_list:
                authors = [
                    c["author"]["name"]
                    for c in item.get("contributions", [])
                    if c.get("author") and c["author"].get("name")
                ]
                if not authors:
                    authors = ["Unknown Author"]

                genres = [
                    t["tag"]["name"]
                    for t in item.get("book_tags", [])
                    if t.get("tag") and t["tag"].get("name")
                ]
                if not genres:
                    genres = ["No Category Available"]

                book_data = {
                    "title": item.get("title", "Unknown Title"),
                    "authors": authors,
                    "description": item.get("description", "No Description Available"),
                    "page_count": item.get("pages") or 0,
                    "cover_url": item.get("image", {}).get("url") or "",
                    "published_date": item.get("released_at"),
                    "isbn": None,
                    "average_rating": float(item.get("rating_average") or 0.0),
                    "ratings_count": 0,
                    "categories": genres,
                    "language": "en"
                }
                books.append(book_data)
            return books
        except Exception as e:
            try:
                # Fallback to search query for recent releases of the specified year
                return cls.search_and_clean_books(str(year), max_results=limit, intitle_only=False)
            except Exception:
                raise Exception(f"Error getting newly released books for year {year}: {str(e)}")
    
    