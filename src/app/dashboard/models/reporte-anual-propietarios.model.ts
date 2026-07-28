export interface ResumenMensual {
  mes: number;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
}

export interface PropiedadResumenAnual {
  propiedadId: number;
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
}

export interface PropietarioResumenAnual {
  propietarioRut: string;
  propietarioNombreCompleto: string;
  anio: number;
  cantidadPropiedades: number;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  resumenMensual: ResumenMensual[];
  propiedades: PropiedadResumenAnual[];
}

export interface ReporteAnualPropietariosResponse {
  anio: number;
  propietarioRutFiltro: string | null;
  cantidadPropietarios: number;
  totalIngresos: number;
  totalEgresos: number;
  balance: number;
  resumenMensualGlobal: ResumenMensual[];
  propietarios: PropietarioResumenAnual[];
}
