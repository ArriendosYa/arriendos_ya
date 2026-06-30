export interface PropertyEventRecord {
  id?: number;
  tipo: string;
  descripcion: string;
  fecha?: string;
  url?: string | null;
  propiedad?: {
    id: number;
  };
}

export interface CreatePropertyEventPayload {
  tipo: string;
  descripcion: string;
  fecha?: string;
  url?: string;
  propiedad: {
    id: number;
  };
}
