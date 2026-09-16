import re

with open('src/components/dashboard/Sidebar.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("  HelpCircle, ", "  HelpCircle, \n  BookOpen, ")

with open('src/components/dashboard/Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
