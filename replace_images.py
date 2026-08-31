"""
@project Reedo
@module replace_images
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date 2026-08-25
"""
import os
import re

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
        
    original = content

    # Regex to find Image with source={{uri: ...}}
    # We will replace <Image with <BookCover
    # And source={{ uri: X }} with uri={X}
    
    def replacer(match):
        img_tag = match.group(0)
        uri_val = match.group(1)
        
        # Replace <Image with <BookCover
        new_tag = img_tag.replace("<Image", "<BookCover", 1)
        # Replace source={{ uri: X }} with uri={X}
        new_tag = re.sub(r'source=\{\{\s*uri:\s*[^}]+\}\}', f'uri={{{uri_val}}}', new_tag)
        
        return new_tag

    # Match <Image ... source={{ uri: X }} ... />
    content = re.sub(r'<Image[^>]+source=\{\{\s*uri:\s*([^}]+)\}\}[^>]*/>', replacer, content)

    if content != original:
        # Add import for BookCover if not present
        if "BookCover" not in content:
            # Add after react-native imports
            import_statement = 'import BookCover from "@/components/BookCover";\n'
            # Let's find a safe place, like after import React
            if 'import React' in content:
                # We need to figure out the correct relative path for BookCover
                # but an absolute alias if available is better. Wait, is there an alias?
                # The project seems to use relative paths like import Icon from "../core/Icon";
                # Let's just calculate relative path to c:\VisualStudio\reedo\mobile\components\BookCover
                
                parts = filepath.split('\\mobile\\')
                if len(parts) > 1:
                    subpath = parts[1]
                    depth = subpath.count('\\')
                    if depth == 0:
                        rel_path = './components/BookCover'
                    else:
                        rel_path = '../' * depth + 'components/BookCover'
                    
                    import_statement = f'import BookCover from "{rel_path}";\n'
                    content = re.sub(r'(import React.*?[\r\n])', r'\1' + import_statement, content, count=1)
                
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    else:
        print(f"No changes for {filepath}")

