
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()
print("".join([l for l in lines if "serviciosPorInfoplaza" in l]))

