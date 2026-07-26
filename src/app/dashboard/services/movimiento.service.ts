import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MovimientoPayload, MovimientoRecord } from '../models/movimiento.model';

@Injectable({
  providedIn: 'root'
})
export class MovimientoService {
  private readonly http = inject(HttpClient);
  private readonly apiBasePath = `${environment.apiBasePath}/movimientos`;

  listByPropiedad(propiedadId: number): Observable<MovimientoRecord[]> {
    return this.http.get<MovimientoRecord[]>(`${this.apiBasePath}/propiedad/${propiedadId}`);
  }

  createConComprobante(
    movimiento: MovimientoPayload,
    comprobante?: File | null
  ): Observable<MovimientoRecord> {
    const formData = new FormData();
    formData.append('movimiento', JSON.stringify(movimiento));
    if (comprobante) {
      formData.append('comprobante', comprobante);
    }

    return this.http.post<MovimientoRecord>(`${this.apiBasePath}/con-comprobante`, formData);
  }

  updateMovimiento(id: number, movimiento: MovimientoPayload): Observable<MovimientoRecord> {
    return this.http.put<MovimientoRecord>(`${this.apiBasePath}/${id}`, movimiento);
  }

  updateComprobante(id: number, comprobante: File): Observable<MovimientoRecord> {
    const formData = new FormData();
    formData.append('comprobante', comprobante);
    return this.http.put<MovimientoRecord>(`${this.apiBasePath}/${id}/comprobante`, formData);
  }

  deleteMovimiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBasePath}/${id}`);
  }
}
