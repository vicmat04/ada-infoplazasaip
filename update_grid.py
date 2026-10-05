import re

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import { AlertCircle, FileText, CheckCircle2, Clock, XCircle, Search, X } from 'lucide-react';", "import { AlertCircle, FileText, CheckCircle2, Clock, XCircle, Search, X, Building } from 'lucide-react';")

old_grid = r"""      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass border-\[var\(--card-border\)\] bg-gradient-to-br from-emerald-900/20 to-transparent">"""

new_grid = """      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-blue-900/20 to-transparent">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Habilitadas</p>
              <h3 className="text-2xl font-bold text-blue-400" title="Infoplazas habilitadas para entregar">{(stats.entregados + stats.pendientes + stats.noEntrega).toLocaleString('es-PA')}</h3>
            </div>
            <Building size={32} className="text-blue-500/30" />
          </CardContent>
        </Card>
        <Card className="glass border-[var(--card-border)] bg-gradient-to-br from-emerald-900/20 to-transparent">"""

content = re.sub(old_grid, new_grid, content)

with open('src/components/dashboard/CuatrimestreAnalytics.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
