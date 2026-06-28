import requests
from django.conf import settings

class GoogleBooksService:
    base_url = "https://www.googleapis.com/books/v1/volumes"
    
    @classmethod
    def search_and_clean_books(cls, query, max_results=5):
      """
      Searches books by Title, Author or ISBN and gets clean metadata for multiple results
      """
      import re
      clean_q = query.strip()
      # Simple and robust check for ISBN (10-18 chars including digits, x/X, spaces, hyphens)
      is_isbn = re.match(r'^[0-9xX -]{10,18}$', clean_q) is not None and sum(1 for c in clean_q if c.isdigit()) >= 9

      api_query = clean_q
      if is_isbn:
          isbn_digits = "".join(c for c in clean_q if c.isalnum())
          api_query = f"isbn:{isbn_digits}"
      else:
          api_query = f"intitle:{clean_q}"

      api_key = getattr(settings, 'GOOGLE_BOOKS_API_KEY', None)
      params = {
          'q': api_query,
          'maxResults': max_results,
          'printType': 'books',
          'langRestrict': 'en'
      }
      if api_key and str(api_key).startswith("AIzaSy"):
          params['key'] = api_key
      try:
        response = requests.get(cls.base_url, params=params)
        response.raise_for_status()
        data = response.json()

        if "items" not in data:
          return []
        
        books = []
        for item in data["items"]:
          volume_info = item.get("volumeInfo", {})
          identifiers = volume_info.get("industryIdentifiers", [])
          isbn = None

          for id_obj in identifiers:
            if id_obj.get("type") == "ISBN_13":
              isbn = id_obj.get("identifier")

          if not isbn and identifiers:
            isbn = identifiers[0].get("identifier")

          book_data = {
            "title": volume_info.get("title", "Unknown Title"),
            "authors": volume_info.get("authors", ["Unknown Author"]),
            "description": volume_info.get("description", "No Description Available"),
            "page_count": volume_info.get("pageCount", 0),
            "cover_url": volume_info.get("imageLinks", {}).get("thumbnail", ""),
            "published_date": volume_info.get("publishedDate", None),
            "isbn": isbn,
            "average_rating": volume_info.get("averageRating", 0.0),
            "ratings_count": volume_info.get("ratingsCount", 0),
            "categories": volume_info.get("categories", ["No Category Available"]),
            "language": volume_info.get("language")
          }
          books.append(book_data)
        return books
        
      except Exception as e:
        raise Exception(f"Error searching books: {str(e)}")

    @classmethod
    def search_authors(cls, query, max_results=5):
      """
      Searches authors by name through Google Books volume search.
      Since Google Books search is volume-based, we search books containing the author,
      extract the authors from volume info, and return a unique set of matching author names.
      """
      api_key = getattr(settings, 'GOOGLE_BOOKS_API_KEY', None)
      params = {
          'q': f'inauthor:"{query}"',
          'maxResults': max_results * 2,
          'printType': 'books',
          'langRestrict': 'en'
      }
      if api_key and str(api_key).startswith("AIzaSy"):
          params['key'] = api_key
      try:
        response = requests.get(cls.base_url, params=params)
        response.raise_for_status()
        data = response.json()

        if "items" not in data:
          return []
        
        authors_set = set()
        for item in data["items"]:
          volume_info = item.get("volumeInfo", {})
          authors = volume_info.get("authors", [])
          for author in authors:
            if query.lower() in author.lower():
              authors_set.add(author)
        
        return list(authors_set)[:max_results]
      except Exception as e:
        raise Exception(f"Error searching authors: {str(e)}")
    
    