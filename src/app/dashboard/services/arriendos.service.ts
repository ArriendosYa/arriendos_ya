import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Arriendo, ArriendoPayload } from '../models/arriendo.model';

@Injectable({
  providedIn: 'root'
})
export class ArriendosService {
  private readonly http = inject(HttpClient);
  private readonly apiBasePath = `${environment.apiBasePath}/arriendos`;

  list(): Observable<Arriendo[]> {
    return this.http.get<Arriendo[]>(this.apiBasePath);
  }

  listByPropiedad(propiedadId: number): Observable<Arriendo[]> {
    return this.http.get<Arriendo[]>(`${this.apiBasePath}/propiedad/${propiedadId}`);
  }

  listByArrendatario(rut: string): Observable<Arriendo[]> {
    return this.http.get<Arriendo[]>(`${this.apiBasePath}/arrendatario/${rut}`);
  }

  create(payload: ArriendoPayload): Observable<Arriendo> {
    return this.http.post<Arriendo>(this.apiBasePath, payload);
  }

  update(id: number, payload: ArriendoPayload): Observable<Arriendo> {
    return this.http.put<Arriendo>(`${this.apiBasePath}/${id}`, payload);
  }

  finalizar(id: number, fechaTermino: string): Observable<void> {
    const params = new HttpParams().set('fechaTermino', fechaTermino);
    return this.http.put<void>(
      `${this.apiBasePath}/${id}/finalizar`,
      {},
      { params }
    );
  }
}
