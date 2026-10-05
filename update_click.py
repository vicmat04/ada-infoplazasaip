import re

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_click = r"""          <button 
            onClick=\{handleVerDetalle\}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >"""

new_click = """          <button 
            onClick={() => handleVerDetalle()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >"""

content = re.sub(old_click, new_click, content)

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
