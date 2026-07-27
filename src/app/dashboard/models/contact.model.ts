export type ContactResource = 'propietarios' | 'arrendatarios';

export interface ContactRecord {
  rut: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
}
