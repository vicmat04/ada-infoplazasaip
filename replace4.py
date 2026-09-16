import re
with open('src/components/dashboard/YoYGrowthTable.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<SortIcon columnKey=\{crec_\$\{selectedAnios\[idx-1\]\}_\$\{anioVal\}\} />', r"{renderSortIcon(crec__)}", content)

with open('src/components/dashboard/YoYGrowthTable.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
