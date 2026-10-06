
with open("src/lib/dashboard/executive-services.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()
print("".join([l for l in lines if "serviciosPorInfoplaza" in l]))

