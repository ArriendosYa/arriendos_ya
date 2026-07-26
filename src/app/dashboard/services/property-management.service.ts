import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PropertyRecord } from '../models/property.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PropertyManagementService {
  private readonly http = inject(HttpClient);
  private readonly apiBasePath = `${environment.apiBasePath}/propiedades`;

  listProperties(): Observable<PropertyRecord[]> {
    return this.http.get<PropertyRecord[]>(this.apiBasePath);
  }

  getProperty(id: number): Observable<PropertyRecord> {
    return this.http.get<PropertyRecord>(`${this.apiBasePath}/${id}`);
  }

  createProperty(payload: Omit<PropertyRecord, 'id'>): Observable<PropertyRecord> {
    return this.http.post<PropertyRecord>(this.apiBasePath, payload);
  }

  updateProperty(id: number, payload: PropertyRecord): Observable<PropertyRecord> {
    return this.http.put<PropertyRecord>(`${this.apiBasePath}/${id}`, payload);
  }

  deleteProperty(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBasePath}/${id}`);
  }
}
