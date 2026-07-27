export type ReporteMovimientoTipo = 'INGRESO' | 'EGRESO';

export interface ReporteMovimiento {
  id: number;
  concepto: string;
  tipo: ReporteMovimientoTipo;
  monto: number;
  fecha: string;
  urlComprobante: string | null;
}

export interface ReporteEvento {
  id: number;
  tipo: string;
  descripcion: string;
  fecha: string;
  url: string | null;
}

export interface ReporteMensualPropiedad {
  propiedadId: number;
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
  mes: number;
  anio: number;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  diasTotalesMes: number;
  diasOcupados: number;
  porcentajeOcupacion: number;
  movimientos: ReporteMovimiento[];
  eventos: ReporteEvento[];
}

export interface EnviarReporteMensualPayload {
  destinatarios: string[];
}
