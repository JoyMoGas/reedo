import os
import re

file_path = r"c:\VisualStudio\reedo\backend\books\views.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace book.cover_image
new_content = re.sub(
    r'"cover_image": book\.cover_image,',
    r'"cover_image": f"https://covers.openlibrary.org/b/isbn/{book.isbn}-L.jpg?default=false" if book.isbn else book.cover_image,',
    content
)

# Also replace new_book.cover_image
new_content = re.sub(
    r'"cover_image": new_book\.cover_image,',
    r'"cover_image": f"https://covers.openlibrary.org/b/isbn/{new_book.isbn}-L.jpg?default=false" if new_book.isbn else new_book.cover_image,',
    new_content
)

# And for db_book in similar contexts if there is any
new_content = re.sub(
    r'"cover_image": db_book\.cover_image,',
    r'"cover_image": f"https://covers.openlibrary.org/b/isbn/{db_book.isbn}-L.jpg?default=false" if db_book.isbn else db_book.cover_image,',
    new_content
)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
