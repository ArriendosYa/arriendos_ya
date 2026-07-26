export interface PropertyRecord {
  id: number;
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
  numeroHabitaciones: number;
  numeroBanos: number;
  precioArriendo: number;
  disponible: boolean;
  propietario: { rut: string };
}

export interface PropertyFilters {
  disponible: boolean | 'Todos';
  comuna: string;
}
