export enum DiaPago {
  DIA_5 = 'DIA_5',
  DIA_10 = 'DIA_10',
  DIA_15 = 'DIA_15',
  DIA_20 = 'DIA_20',
  DIA_25 = 'DIA_25',
  DIA_30 = 'DIA_30'
}

export interface Arriendo {
  id?: number;
  propiedad: { id: number };
  arrendatario: { rut: string };
  fechaInicio: string;
  fechaTermino?: string;
  diaPago: DiaPago;
  reajusteSemestral: number;
  activo: boolean;
}

export interface ArriendoPayload {
  propiedad: { id: number };
  arrendatario: { rut: string };
  fechaInicio: string;
  fechaTermino: string;
  diaPago: DiaPago;
  reajusteSemestral: number;
  activo: boolean;
}
