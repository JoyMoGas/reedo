import re

file_path = r"c:\VisualStudio\reedo\backend\books\views.py"

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# For TrendingBooksView
trending_find = """
                if db_book and db_book not in trending_books:
                    trending_books.append(db_book)
"""
trending_replace = """
                if db_book and db_book not in trending_books and db_book.cover_image:
                    trending_books.append(db_book)
"""

if trending_find.lstrip("\n") in content:
    content = content.replace(trending_find.lstrip("\n"), trending_replace.lstrip("\n"))
else:
    # Try regex if exact match fails
    content = re.sub(
        r"if db_book and db_book not in trending_books:\s+trending_books\.append\(db_book\)",
        r"if db_book and db_book not in trending_books and db_book.cover_image:\n                    trending_books.append(db_book)",
        content
    )


# For TrendingBooksView fallback
trending_fb_find = """
        if len(trending_books) < 10:
            fallback = Books.objects.all().order_by('-average_rating')[:10]
            for b in fallback:
                if b not in trending_books:
                    trending_books.append(b)
"""
trending_fb_replace = """
        if len(trending_books) < 10:
            fallback = Books.objects.exclude(cover_image='').exclude(cover_image__isnull=True).order_by('-average_rating')[:10]
            for b in fallback:
                if b not in trending_books and b.cover_image:
                    trending_books.append(b)
"""

if trending_fb_find.lstrip("\n") in content:
    content = content.replace(trending_fb_find.lstrip("\n"), trending_fb_replace.lstrip("\n"))
else:
    content = re.sub(
        r"fallback = Books\.objects\.all\(\)\.order_by\('-average_rating'\)\[:10\]",
        r"fallback = Books.objects.exclude(cover_image='').exclude(cover_image__isnull=True).order_by('-average_rating')[:10]",
        content
    )


# For NewlyArrivedBooksView
new_find = """
                if db_book and db_book not in new_books:
                    new_books.append(db_book)
"""
new_replace = """
                if db_book and db_book not in new_books and db_book.cover_image:
                    new_books.append(db_book)
"""
if new_find.lstrip("\n") in content:
    content = content.replace(new_find.lstrip("\n"), new_replace.lstrip("\n"))
else:
    content = re.sub(
        r"if db_book and db_book not in new_books:\s+new_books\.append\(db_book\)",
        r"if db_book and db_book not in new_books and db_book.cover_image:\n                    new_books.append(db_book)",
        content
    )


# For NewlyArrivedBooksView fallback
new_fb_find = """
        if len(new_books) < 5:
            fallback = Books.objects.filter(published_date__year=current_year).order_by('-average_rating')[:10]
"""
new_fb_replace = """
        if len(new_books) < 5:
            fallback = Books.objects.filter(published_date__year=current_year).exclude(cover_image='').exclude(cover_image__isnull=True).order_by('-average_rating')[:10]
"""
if new_fb_find.lstrip("\n") in content:
    content = content.replace(new_fb_find.lstrip("\n"), new_fb_replace.lstrip("\n"))
else:
    content = re.sub(
        r"fallback = Books\.objects\.filter\(published_date__year=current_year\)\.order_by\('-average_rating'\)\[:10\]",
        r"fallback = Books.objects.filter(published_date__year=current_year).exclude(cover_image='').exclude(cover_image__isnull=True).order_by('-average_rating')[:10]",
        content
    )

new_fb2_find = """
            if len(new_books) < 5:
                fallback = Books.objects.all().order_by('-published_date', '-average_rating')[:10]
"""
new_fb2_replace = """
            if len(new_books) < 5:
                fallback = Books.objects.exclude(cover_image='').exclude(cover_image__isnull=True).order_by('-published_date', '-average_rating')[:10]
"""
if new_fb2_find.lstrip("\n") in content:
    content = content.replace(new_fb2_find.lstrip("\n"), new_fb2_replace.lstrip("\n"))
else:
    content = re.sub(
        r"fallback = Books\.objects\.all\(\)\.order_by\('-published_date', '-average_rating'\)\[:10\]",
        r"fallback = Books.objects.exclude(cover_image='').exclude(cover_image__isnull=True).order_by('-published_date', '-average_rating')[:10]",
        content
    )

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
