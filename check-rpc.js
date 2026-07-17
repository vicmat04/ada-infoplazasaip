const fs = require('fs');
const path = require('path');

// Evitar error de WebSocket en Node.js < 22
if (typeof global !== 'undefined' && !global.WebSocket) {
  global.WebSocket = class {} ;
}

const { createClient } = require('@supabase/supabase-js');

// 1. Cargar variables de entorno desde .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
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
    // Quitar comillas si existen
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    envVars[key] = value.trim();
  }
});

const url = envVars.SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Error: Faltan credenciales de Supabase en .env.local');
  process.exit(1);
}

console.log('Intentando conectar a Supabase en:', url);
const supabase = createClient(url, key, {
  auth: {
    persistSession: false
  }
});

async function testRpc() {
  try {
    console.log('\n--- Probando RPC ipa_get_periodos_disponibles ---');
    const { data: periodos, error: errPeriods } = await supabase.rpc('ipa_get_periodos_disponibles');
    if (errPeriods) {
      console.error('❌ Error en ipa_get_periodos_disponibles:', errPeriods);
    } else {
      console.log('✅ Éxito! Períodos devueltos:', periodos ? periodos.length : 0);
      console.log('Muestra de períodos:', periodos ? periodos.slice(0, 3) : []);
    }

    console.log('\n--- Probando RPC ipa_get_dashboard_snapshot ---');
    const { data: snapshot, error: errSnapshot } = await supabase.rpc('ipa_get_dashboard_snapshot', {
      p_anio: 0,
      p_mes: '',
      p_regional: '',
      p_provincia: '',
      p_infoplaza: 0
    });

    if (errSnapshot) {
      console.error('❌ Error en ipa_get_dashboard_snapshot:', errSnapshot);
    } else {
      console.log('✅ Éxito! Snapshot devuelto con estructura correcta.');
      console.log('Visitor segments devueltos:', snapshot?.visitorSegments);
      console.log('Total Atenciones en el snapshot:', snapshot?.serviceKpis?.totalAtenciones);
      console.log('Total Visitantes en el snapshot:', snapshot?.visitorKpis?.totalVisitantes);
      console.log('Cantidad de filas para la tabla:', snapshot?.tableRows ? snapshot.tableRows.length : 0);
    }
  } catch (err) {
    console.error('Error inesperado ejecutando pruebas:', err);
  }
}

testRpc();
