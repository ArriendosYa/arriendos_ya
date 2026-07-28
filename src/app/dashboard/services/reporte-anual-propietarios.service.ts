import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReporteAnualPropietariosResponse } from '../models/reporte-anual-propietarios.model';

@Injectable({
  providedIn: 'root'
})
export class ReporteAnualPropietariosService {
  private readonly http = inject(HttpClient);
  private readonly apiBasePath = `${environment.apiBasePath}/reportes/propietarios`;

  getReporteAnual(anio: number, propietarioRut?: string): Observable<ReporteAnualPropietariosResponse> {
    let params = new HttpParams().set('anio', anio);
    if (propietarioRut) {
      params = params.set('propietarioRut', propietarioRut);
    }
    return this.http.get<ReporteAnualPropietariosResponse>(`${this.apiBasePath}/anual`, { params });
  }

  exportarPdf(anio: number, propietarioRut?: string): Observable<Blob> {
    let params = new HttpParams().set('anio', anio);
    if (propietarioRut) {
      params = params.set('propietarioRut', propietarioRut);
    }
    return this.http.get(`${this.apiBasePath}/anual/exportar/pdf`, { params, responseType: 'blob' });
  }

  exportarExcel(anio: number, propietarioRut?: string): Observable<Blob> {
    let params = new HttpParams().set('anio', anio);
    if (propietarioRut) {
      params = params.set('propietarioRut', propietarioRut);
    }
    return this.http.get(`${this.apiBasePath}/anual/exportar/excel`, { params, responseType: 'blob' });
  }
}
