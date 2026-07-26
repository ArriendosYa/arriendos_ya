export type MovimientoTipo = 'INGRESO' | 'EGRESO';

export const MOVIMIENTO_TIPOS: MovimientoTipo[] = ['INGRESO', 'EGRESO'];

export interface MovimientoRecord {
  id?: number;
  propiedad: {
    id: number;
  };
  tipo: MovimientoTipo;
  concepto: string;
  monto: number;
  fecha: string;
  estado?: string;
  comprobanteUrl?: string;
}

export interface MovimientoPayload {
  propiedad: {
    id: number;
  };
  tipo: MovimientoTipo;
  concepto: string;
  monto: number;
  fecha: string;
  estado?: string;
}
