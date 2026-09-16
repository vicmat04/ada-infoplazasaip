export interface InformeHeader {
  id: string;
  infoplaza_numero: number;
  anio: number;
  cuatrimestre: number;
  cant_computadoras: number;
  asociado_nombre: string | null;
  asociado_cedula: string | null;
  dinamizador_nombre: string | null;
  dinamizador_cedula: string | null;
  observaciones_generales: string | null;
  created_at: string;
  updated_at: string;
}

export interface InformeCapacitacion {
  id: string;
  informe_id: string;
  infoplaza_numero: number;
  anio: number;
  cuatrimestre: number;
  mes: number | null;
  tema: string;
  participantes: number;
  horas: number;
  observaciones: string | null;
  orden: number | null;
  created_at: string;
  categoria: string | null;
}

export interface InformeOtrasActividades {
  id: string;
  informe_id: string;
  infoplaza_numero: number;
  anio: number;
  cuatrimestre: number;
  actividad: string;
  observaciones: string | null;
  orden: number | null;
  created_at: string;
  categoria: string | null;
  participantes: number;
}

export interface InformeServicios {
  id: string;
  informe_id: string;
  infoplaza_numero: number;
  anio: number;
  cuatrimestre: number;
  servicio_nombre: string;
  ofrecido: boolean;
  es_personalizado: boolean;
  observaciones: string | null;
  created_at: string;
}

export interface ControlEntrega {
  infoplaza_numero: number;
  anio: number;
  cuatrimestre: number;
  estado: 'Entregado' | 'Pendiente' | 'No entrega' | string;
  motivo: string | null;
  updated_at: string;
}

export interface AgregadoCapacitacion {
  categoria: string;
  total_participantes: number;
  total_horas: number;
}

export interface AgregadoOtraActividad {
  categoria: string;
  total_participantes: number;
}

