import sys

with open('src/app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace 1: getDashboardData transition
old_code1 = '''      startTransition(async () => {
        const res = await getDashboardData(filters);
        if (res.success && res.data) {
          setDashboardData(res.data);
        }
      });'''

new_code1 = '''      startTransition(async () => {
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
      });'''

# Replace 2: Catalog fetch
old_code2 = '''      // Cargar catálogos iniciales
      const loadInitialData = async () => {
        setIsCatalogLoading(true);
        const [ipsRes, periodsRes] = await Promise.all([
          getInfoplazasCatalog(),
          getAvailablePeriods()
        ]);
        
        if (ipsRes.success && ipsRes.data) {
          setAllInfoplazas(ipsRes.data);
        }
        if (periodsRes.success && periodsRes.data) {
          setAvailablePeriods(periodsRes.data);
        }
        setIsCatalogLoading(false);
      };'''

new_code2 = '''      // Cargar catálogos iniciales
      const loadInitialData = async () => {
        setIsCatalogLoading(true);
        setFetchError(null);
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
        }
        setIsCatalogLoading(false);
      };'''

# Replace 3: Loading spinner UI
old_code3 = '''          {/* Estado de carga general inicial */}
          {!dashboardData && (
            <div className="h-[460px] flex flex-col items-center justify-center text-center p-6">
              <RefreshCw className="w-10 h-10 mb-4 animate-spin text-blue-500" />
              <p className="text-slate-400 font-medium">Cargando métricas principales...</p>
            </div>
          )}'''

new_code3 = '''          {/* Estado de Error */}
          {!dashboardData && fetchError && (
            <div className="h-[460px] flex flex-col items-center justify-center text-center p-6 border border-red-500/20 bg-red-500/10 rounded-xl">
              <div className="text-red-500 font-bold text-xl mb-2">Error de Conexión</div>
              <p className="text-red-400 font-medium">{fetchError}</p>
              <p className="text-slate-400 text-sm mt-4 max-w-md">Si el error indica que no se encuentra la función, asegúrese de haber corrido el script SQL más reciente en Supabase para actualizar el RPC.</p>
            </div>
          )}

          {/* Estado de carga general inicial */}
          {!dashboardData && !fetchError && (
            <div className="h-[460px] flex flex-col items-center justify-center text-center p-6">
              <RefreshCw className="w-10 h-10 mb-4 animate-spin text-blue-500" />
              <p className="text-slate-400 font-medium">Cargando métricas principales...</p>
            </div>
          )}'''

# Replace 4: The effect return early
old_code4 = '''    useEffect(() => {
      if (allInfoplazas.length === 0) return;'''
new_code4 = '''    useEffect(() => {
      if (fetchError) return;
      if (allInfoplazas.length === 0 && isCatalogLoading) return;'''

import re
def normalize_newlines(text):
    return re.sub(r'\r\n', '\n', text)

content_norm = normalize_newlines(content)
old_code1 = normalize_newlines(old_code1)
old_code2 = normalize_newlines(old_code2)
old_code3 = normalize_newlines(old_code3)
old_code4 = normalize_newlines(old_code4)

content_norm = content_norm.replace(old_code1, new_code1)
content_norm = content_norm.replace(old_code2, new_code2)
content_norm = content_norm.replace(old_code3, new_code3)
content_norm = content_norm.replace(old_code4, new_code4)

with open('src/app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content_norm)
