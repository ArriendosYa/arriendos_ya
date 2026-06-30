import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreatePropertyEventPayload, PropertyEventRecord } from '../models/property-event.model';

@Injectable({
  providedIn: 'root'
})
export class PropertyEventService {
  private readonly http = inject(HttpClient);
  private readonly apiBasePath = `${environment.apiBasePath}/eventos`;

  listByPropertyId(propiedadId: number): Observable<PropertyEventRecord[]> {
    return this.http.get<PropertyEventRecord[]>(`${this.apiBasePath}/propiedad/${propiedadId}`);
  }

  createEvent(payload: CreatePropertyEventPayload): Observable<PropertyEventRecord> {
    return this.http.post<PropertyEventRecord>(this.apiBasePath, payload);
  }
}
