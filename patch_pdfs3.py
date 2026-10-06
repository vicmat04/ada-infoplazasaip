import os
import re

files = [
    "src/components/dashboard/CapacitacionesAnalytics.tsx",
    "src/components/dashboard/ReporteIndividualSection.tsx"
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Replace await toPng( -> await toJpeg(
    content = re.sub(r"await toPng\(", "await toJpeg(", content)
    
    # 2. Add quality parameter if missing, or change quality: 1 to quality: 0.8
    content = re.sub(r"pixelRatio: 2,\s*backgroundColor:", r"pixelRatio: 2, quality: 0.8, backgroundColor:", content)
    content = re.sub(r"quality:\s*1,", "quality: 0.8,", content)
    
    # 3. Replace PDF image addition
    content = re.sub(r"pdf\.addImage\(url,\s*'PNG',", "pdf.addImage(url, 'JPEG',", content)
    content = re.sub(r"pdf\.addImage\(dataUrl,\s*'PNG',", "pdf.addImage(dataUrl, 'JPEG',", content)
    content = re.sub(r"canvas\.toDataURL\('image/png'\)", "canvas.toDataURL('image/jpeg', 0.8)", content)
    content = re.sub(r"pdf\.addImage\(canvas\.toDataURL[^\)]+\),\s*'PNG'", "pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG'", content)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
print("done")
