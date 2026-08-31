"""
@project Reedo
@module fix_imports
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-08-25
"""
import os

files = [
    r"c:\VisualStudio\reedo\mobile\components\home\KeepReading.tsx",
    r"c:\VisualStudio\reedo\mobile\components\home\GlobalBookshelf.tsx",
    r"c:\VisualStudio\reedo\mobile\components\home\FriendsJourneys.tsx",
    r"c:\VisualStudio\reedo\mobile\components\BookCard.tsx",
    r"c:\VisualStudio\reedo\mobile\app\PostReview.tsx",
    r"c:\VisualStudio\reedo\mobile\app\newly-arrived.tsx",
    r"c:\VisualStudio\reedo\mobile\app\hidden-gems.tsx",
    r"c:\VisualStudio\reedo\mobile\app\BookDetails.tsx",
    r"c:\VisualStudio\reedo\mobile\app\(tabs)\discover.tsx",
    r"c:\VisualStudio\reedo\mobile\app\(auth)\books.tsx"
]

for filepath in files:
    if not os.path.exists(filepath):
        continue
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "import BookCover from" not in content and "<BookCover" in content:
        parts = filepath.split('\\mobile\\')
        if len(parts) > 1:
            subpath = parts[1]
            depth = subpath.count('\\')
            if depth == 0:
                rel_path = './components/BookCover'
            else:
                rel_path = '../' * depth + 'components/BookCover'
            
            import_statement = f'import BookCover from "{rel_path}";\n'
            # find first import
            idx = content.find('import ')
            if idx != -1:
                content = content[:idx] + import_statement + content[idx:]
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f"Added import to {filepath}")
