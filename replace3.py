import re

with open('src/components/dashboard/YoYGrowthTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<SortIcon columnKey="([^"]+)" />', r"{renderSortIcon('\1')}", content)
content = re.sub(r'<SortIcon columnKey=\{([^}]+)\} />', r"{renderSortIcon(\1)}", content)

with open('src/components/dashboard/YoYGrowthTable.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
