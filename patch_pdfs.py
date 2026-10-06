
import os

files = [
    "src/components/dashboard/CapacitacionesAnalytics.tsx",
    "src/components/dashboard/ReporteIndividualSection.tsx"
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Replace import { toPng } with { toJpeg }
    content = content.replace("const { toPng } = await import('html-to-image');", "const { toJpeg } = await import('html-to-image');")
    
    # 2. Replace toPng(el, { with toJpeg(el, {
    # 3. Add quality: 0.8
    # For CapacitacionesAnalytics.tsx
    content = content.replace(
        "const url = await toPng(el, {\\n            pixelRatio: 2, backgroundColor: fondo,", 
        "const url = await toJpeg(el, {\\n            pixelRatio: 2, quality: 0.8, backgroundColor: fondo,"
    )
    content = content.replace("pdf.addImage(url, 'PNG', m, y, ancho, alto);", "pdf.addImage(url, 'JPEG', m, y, ancho, alto);")
    content = content.replace("const canvas = await import('html2canvas').then((m) => m.default(el, { scale: 2, backgroundColor: fondo, ignoreElements: (node) => node.dataset?.exportIgnore !== undefined }));", "const canvas = await import('html2canvas').then((m) => m.default(el, { scale: 2, backgroundColor: fondo, ignoreElements: (node) => node.dataset?.exportIgnore !== undefined }));")
    content = content.replace("pdf.addImage(canvas.toDataURL('image/png'), 'PNG', m, m, ancho, h);", "pdf.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', m, m, ancho, h);")
    
    # For ReporteIndividualSection.tsx
    content = content.replace(
        "const dataUrl = await toPng(element, {\\n          quality: 1,\\n          pixelRatio: 2,\\n          backgroundColor: '#ffffff'\\n        });", 
        "const dataUrl = await toJpeg(element, {\\n          quality: 0.8,\\n          pixelRatio: 2,\\n          backgroundColor: '#ffffff'\\n        });"
    )
    content = content.replace("pdf.addImage(dataUrl, 'PNG',", "pdf.addImage(dataUrl, 'JPEG',")
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
print("done")

