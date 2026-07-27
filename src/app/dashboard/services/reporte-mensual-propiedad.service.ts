import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EnviarReporteMensualPayload,
  ReporteMensualPropiedad
} from '../models/reporte-mensual-propiedad.model';

@Injectable({
  providedIn: 'root'
})
export class ReporteMensualPropiedadService {
  private readonly http = inject(HttpClient);
  private readonly apiBasePath = `${environment.apiBasePath}/reportes/propiedad`;

  getReporteMensual(
    propiedadId: number,
    anio: number,
    mes: number
  ): Observable<ReporteMensualPropiedad> {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    return this.http.get<ReporteMensualPropiedad>(
      `${this.apiBasePath}/${propiedadId}/mensual`,
      { params }
    );
  }

  enviarReporteMensual(
    propiedadId: number,
    anio: number,
    mes: number,
    payload: EnviarReporteMensualPayload
  ): Observable<void> {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    return this.http.post<void>(`${this.apiBasePath}/${propiedadId}/mensual/enviar`, payload, { params });
  }
}
