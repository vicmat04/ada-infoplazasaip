const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Leer variables de .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  const k = parts[0];
  const v = parts.slice(1).join('=');
  if (k && v) {
    env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function runAudit() {
  console.log('================ AUDITORIA DE SUPABASE ================');

  // 1. Infoplazas
  const { count: totalInfoplazas } = await supabase
    .from('infoplazas')
    .select('*', { count: 'exact', head: true });
  
  const { count: totalActivas } = await supabase
    .from('infoplazas')
    .select('*', { count: 'exact', head: true })
    .eq('estado', 'Activa');

  console.log('Total Infoplazas:', totalInfoplazas);
  console.log('Total Infoplazas Activas:', totalActivas);

  // 2. Conteo en resumen_demografico por anio
  const anios = [2023, 2024, 2025, 2026];
  for (const anio of anios) {
    const { count } = await supabase
      .from('resumen_demografico')
      .select('*', { count: 'exact', head: true })
      .eq('anio', anio);
    console.log(`Filas en resumen_demografico año ${anio}:`, count);
  }

  // 3. Prueba de la consulta de getComparativeGrowthData (meses 4, 5, 6, 7 en 2026)
  const meses = [4, 5, 6, 7];
  const { count: countMeses } = await supabase
    .from('resumen_demografico')
    .select('*', { count: 'exact', head: true })
    .eq('anio', 2026)
    .in('mes_numero', meses);
  
  console.log('\n--- CASO 1: getComparativeGrowthData (4 meses: Abr, May, Jun, Jul 2026) ---');
  console.log('Total de registros REALES que coinciden en la base de datos:', countMeses);

  const { data: dataReturned1 } = await supabase
    .from('resumen_demografico')
    .select('numero_infoplaza, mes_numero, total, infoplazas!inner(nombre, regional, provincia, estado)')
    .eq('anio', 2026)
    .in('mes_numero', meses)
    .eq('infoplazas.estado', 'Activa');
  
  console.log('Total de registros DEVUELTOS por Supabase SDK sin paginación:', dataReturned1.length);
  
  const grouped1 = {};
  dataReturned1.forEach(row => {
    grouped1[row.numero_infoplaza] = true;
  });
  console.log('Infoplazas resultantes en la tabla:', Object.keys(grouped1).length);

  // 4. Prueba de la consulta de getCuatrimestreData (año 2026)
  console.log('\n--- CASO 2: getCuatrimestreData (año 2026 completo) ---');
  const { count: countCuatri2026 } = await supabase
    .from('resumen_demografico')
    .select('*', { count: 'exact', head: true })
    .eq('anio', 2026);
  console.log('Total de registros REALES en BD para 2026:', countCuatri2026);

  const { data: dataReturned2 } = await supabase
    .from('resumen_demografico')
    .select('numero_infoplaza, anio, mes_numero, total, infoplazas!inner(nombre, regional, provincia, estado)')
    .in('anio', [2026])
    .eq('infoplazas.estado', 'Activa');
  
  console.log('Total de registros DEVUELTOS por Supabase SDK:', dataReturned2.length);
  const grouped2 = {};
  dataReturned2.forEach(row => {
    grouped2[row.numero_infoplaza] = true;
  });
  console.log('Infoplazas resultantes en la tabla Cuatrimestres 2026:', Object.keys(grouped2).length);

  // 5. Prueba de getCuatrimestreData para 3 años (2024, 2025, 2026)
  console.log('\n--- CASO 3: getCuatrimestreData (años 2024, 2025, 2026) ---');
  const { count: countCuatri3Years } = await supabase
    .from('resumen_demografico')
    .select('*', { count: 'exact', head: true })
    .in('anio', [2024, 2025, 2026]);
  console.log('Total de registros REALES en BD (2024-2026):', countCuatri3Years);

  const { data: dataReturned3 } = await supabase
    .from('resumen_demografico')
    .select('numero_infoplaza, anio, mes_numero, total, infoplazas!inner(nombre, regional, provincia, estado)')
    .in('anio', [2024, 2025, 2026])
    .eq('infoplazas.estado', 'Activa');
  
  console.log('Total de registros DEVUELTOS por Supabase SDK:', dataReturned3.length);
  const grouped3 = {};
  dataReturned3.forEach(row => {
    grouped3[row.numero_infoplaza] = true;
  });
  console.log('Infoplazas resultantes en la tabla Cuatrimestres Histórico:', Object.keys(grouped3).length);

  // 6. Revisar si hay diferencias entre resumen_demografico y visitas_historicas o si resumen_demografico está actualizado
  console.log('\n--- CASO 4: Chequeo de consistencia entre tablas/vistas ---');
  const { count: totalVisitasHist } = await supabase
    .from('visitas_historicas')
    .select('*', { count: 'exact', head: true });
  console.log('Total filas en visitas_historicas:', totalVisitasHist);

  // Comprobar si hay infoplazas activas que faltan en resumen_demografico
  const { data: allActivas } = await supabase
    .from('infoplazas')
    .select('numero, nombre, regional, provincia')
    .eq('estado', 'Activa');
  
  console.log('Infoplazas activas totales:', allActivas.length);
}

runAudit().catch(console.error);
