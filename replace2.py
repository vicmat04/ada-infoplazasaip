import re

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Handle infinite spinner early return
content = re.sub(
    r'if \(allInfoplazas\.length === 0\) return;',
    'if (fetchError) return;\n      if (allInfoplazas.length === 0 && isCatalogLoading) return;',
    content
)

# Fix 2: Wrap startTransition in try-catch and setFetchError
content = re.sub(
    r'startTransition\(async \(\) => \{\s*const res = await getDashboardData\(filters\);\s*if \(res\.success && res\.data\) \{\s*setDashboardData\(res\.data\);\s*\}\s*\}\);',
    '''startTransition(async () => {
        try {
          setFetchError(null);
          const res = await getDashboardData(filters);
          if (res?.success && res.data) {
            setDashboardData(res.data);
          } else {
            setFetchError(res?.error || 'Error al obtener datos');
          }
        } catch (err: any) {
          setFetchError(err?.message || 'Error catastrófico de red');
        }
      });''',
    content
)

# Fix 3: Handle loadInitialData error
content = re.sub(
    r'const \[ipsRes, periodsRes\] = await Promise\.all\(\[\s*getInfoplazasCatalog\(\),\s*getAvailablePeriods\(\)\s*\]\);\s*if \(ipsRes\.success && ipsRes\.data\) \{\s*setAllInfoplazas\(ipsRes\.data\);\s*\}\s*if \(periodsRes\.success && periodsRes\.data\) \{\s*setAvailablePeriods\(periodsRes\.data\);\s*\}',
    '''setFetchError(null);
        try {
          const [ipsRes, periodsRes] = await Promise.all([
            getInfoplazasCatalog(),
            getAvailablePeriods()
          ]);
          
          if (ipsRes.success && ipsRes.data) {
            setAllInfoplazas(ipsRes.data);
          } else {
            setFetchError(ipsRes.error || 'Error al cargar catálogo de Infoplazas');
          }

          if (periodsRes.success && periodsRes.data) {
            setAvailablePeriods(periodsRes.data);
          }
        } catch (e: any) {
          setFetchError(e.message || 'Error de conexión inicial');
        }''',
    content
)

# Fix 4: Add Error Box UI
content = re.sub(
    r'\{\/\* Estado de carga general inicial \*\/\}\s*\{!dashboardData && \(\s*<div className="h-\[460px\] flex flex-col items-center justify-center text-center p-6">\s*<RefreshCw className="w-10 h-10 mb-4 animate-spin text-blue-500" \/>\s*<p className="text-slate-400 font-medium">Cargando métricas principales\.\.\.<\/p>\s*<\/div>\s*\)\}',
    '''{/* Estado de Error */}
          {!dashboardData && fetchError && (
            <div className="h-[460px] flex flex-col items-center justify-center text-center p-6 border border-red-500/20 bg-red-500/10 rounded-xl">
              <div className="text-red-500 font-bold text-xl mb-2">Error de Conexión</div>
              <p className="text-red-400 font-medium">{fetchError}</p>
              <p className="text-slate-400 text-sm mt-4 max-w-md">Si el error indica que no se encuentra la función, asegúrese de haber corrido el script SQL más reciente en Supabase para actualizar el RPC. Si está en Vercel Preview, revise que las variables de entorno estén marcadas para Preview.</p>
            </div>
          )}

          {/* Estado de carga general inicial */}
          {!dashboardData && !fetchError && (
            <div className="h-[460px] flex flex-col items-center justify-center text-center p-6">
              <RefreshCw className="w-10 h-10 mb-4 animate-spin text-blue-500" />
              <p className="text-slate-400 font-medium">Cargando métricas principales...</p>
            </div>
          )}''',
    content
)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
