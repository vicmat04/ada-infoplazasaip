with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("setUserProfile(res.data.profile);", "if (res.data) setUserProfile(res.data.profile);")

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
