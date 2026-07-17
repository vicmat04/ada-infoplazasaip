const fs = require('fs');
const path = require('path');

// Evitar error de WebSocket en Node.js < 22
if (typeof global !== 'undefined' && !global.WebSocket) {
  global.WebSocket = class {} ;
}

const { createClient } = require('@supabase/supabase-js');

const envPath = path.join('c:\\Users\\vdominguez\\Downloads\\historicoVisitasAIP', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: No se encontró el archivo .env.local');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    envVars[key] = value.trim();
  }
});

const url = envVars.SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key, {
  auth: {
    persistSession: false
  }
});

async function check() {
  try {
    const { data: snapJuly, error } = await supabase.rpc('ipa_get_dashboard_snapshot', {
      p_anio: 2026,
      p_mes: 'Julio',
      p_regional: '',
      p_provincia: '',
      p_infoplaza: 0
    });
    
    if (error) throw error;
    console.log('Dashboard Snapshot KPIs for Julio 2026:');
    console.log('totalActivas:', snapJuly.networkKpis.totalActivas);
    console.log('totalReportadas:', snapJuly.networkKpis.totalReportadas);
    console.log('ipsRevision:', snapJuly.networkKpis.ipsRevision);
    console.log('ipsConActividadPeriodo:', snapJuly.networkKpis.ipsConActividadPeriodo);
    
  } catch (err) {
    console.error(err);
  }
}

check();
