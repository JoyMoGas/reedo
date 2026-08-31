import os
import subprocess
from datetime import datetime

def get_creation_date(filepath):
    try:
        result = subprocess.run(
            ['git', 'log', '--diff-filter=A', '--format=%ad', '--date=short', '--', filepath],
            capture_output=True, text=True, check=True
        )
        output = result.stdout.strip()
        if output:
            return output.split('\n')[-1]
    except Exception:
        pass
    
    try:
        stat = os.stat(filepath)
        return datetime.fromtimestamp(stat.st_ctime).strftime('%Y-%m-%d')
    except Exception:
        return '2026-08-30'

def add_credits_to_file(filepath):
    ext = os.path.splitext(filepath)[1].lower()
    if ext not in ['.py', '.js', '.ts', '.tsx', '.jsx']:
        return
        
    filename = os.path.basename(filepath)
    module_name = os.path.splitext(filename)[0]
    date_str = get_creation_date(filepath)
    
    if ext == '.py':
        header = f'''"""
@project Reedo
@module {module_name}
@author José Antonio Montaño (Lead Developer)
@inspired-by Alondra Gamino (Constant Inspiration)
@date {date_str}
"""
'''
    else:
        header = f'''/**
 * @project Reedo
 * @module {module_name}
 * @author José Antonio Montaño (Lead Developer)
 * @inspired-by Alondra Gamino (Constant Inspiration)
 * @date {date_str}
 */
'''

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        if '@project Reedo' in content:
            return
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(header + content)
        print(f"Added credits to {filepath} with date {date_str}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def process_directory(directory):
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        if '.venv' in dirs:
            dirs.remove('.venv')
        if '__pycache__' in dirs:
            dirs.remove('__pycache__')
        if '.git' in dirs:
            dirs.remove('.git')
        if '.expo' in dirs:
            dirs.remove('.expo')
            
        for file in files:
            add_credits_to_file(os.path.join(root, file))

if __name__ == '__main__':
    process_directory('c:/VisualStudio/reedo')
