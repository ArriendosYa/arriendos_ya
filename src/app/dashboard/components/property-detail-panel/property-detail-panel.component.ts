import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { CreatePropertyEventPayload, PropertyEventRecord } from '../../models/property-event.model';
import { PropertyRecord } from '../../models/property.model';
import { PropertyEventService } from '../../services/property-event.service';

@Component({
  selector: 'app-property-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './property-detail-panel.component.html',
  styleUrl: './property-detail-panel.component.css'
})
export class PropertyDetailPanelComponent implements OnChanges {
  private readonly propertyEventService = inject(PropertyEventService);

  @Input() property: PropertyRecord | null = null;
  @Input() isSaving = false;
  @Input() errorMessage = '';

  @Output() readonly save = new EventEmitter<PropertyRecord>();

  editableProperty: PropertyRecord | null = null;
  events: PropertyEventRecord[] = [];
  isLoadingEvents = false;
  isCreatingEvent = false;
  eventsErrorMessage = '';
  eventFormErrorMessage = '';
  readonly eventTypeOptions = ['visita', 'llamada', 'mantenimiento', 'firma', 'otro'];
  readonly eventFormModel = {
    tipo: 'visita',
    fecha: '',
    descripcion: '',
    observaciones: '',
    url: ''
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['property']) {
      this.editableProperty = this.property ? { ...this.property } : null;
      this.resetEventForm();

      if (this.property?.id) {
        this.loadEvents(this.property.id);
      } else {
        this.events = [];
      }
    }
  }

  saveChanges(): void {
    if (this.editableProperty) {
      this.save.emit({ ...this.editableProperty });
    }
  }

  createEvent(): void {
    if (!this.property?.id) {
      this.eventFormErrorMessage = 'Guarda la propiedad antes de registrar eventos.';
      return;
    }

    if (!this.eventFormModel.tipo.trim() || !this.eventFormModel.descripcion.trim()) {
      this.eventFormErrorMessage = 'Completa al menos el tipo y la descripción del evento.';
      return;
    }

    if (this.eventFormModel.url.trim() && !this.isValidUrl(this.eventFormModel.url)) {
      this.eventFormErrorMessage = 'Ingresa una URL válida o deja el campo vacío.';
      return;
    }

    this.isCreatingEvent = true;
    this.eventFormErrorMessage = '';
    this.eventsErrorMessage = '';

    this.propertyEventService
      .createEvent(this.buildCreateEventPayload(this.property.id))
      .pipe(finalize(() => (this.isCreatingEvent = false)))
      .subscribe({
        next: () => {
          this.resetEventForm();
          this.loadEvents(this.property!.id);
        },
        error: (error) => {
          this.eventFormErrorMessage = this.extractErrorMessage(
            error,
            'No se pudo registrar el evento. Intenta nuevamente.'
          );
        }
      });
  }

  refreshEvents(): void {
    if (this.property?.id) {
      this.loadEvents(this.property.id);
    }
  }

  formatEventDate(fecha?: string): string {
    if (!fecha) return 'Fecha no informada';

    const parsedDate = new Date(fecha);

    if (Number.isNaN(parsedDate.getTime())) {
      return fecha;
    }

    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(parsedDate);
  }

  formatEventType(tipo: string): string {
    return tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : 'Evento';
  }

  private loadEvents(propertyId: number): void {
    this.isLoadingEvents = true;
    this.eventsErrorMessage = '';

    this.propertyEventService
      .listByPropertyId(propertyId)
      .pipe(finalize(() => (this.isLoadingEvents = false)))
      .subscribe({
        next: (events) => {
          if (this.property?.id !== propertyId) {
            return;
          }

          this.events = [...events].sort((left, right) => {
            const leftDate = new Date(left.fecha ?? 0).getTime();
            const rightDate = new Date(right.fecha ?? 0).getTime();
            return rightDate - leftDate;
          });
        },
        error: (error) => {
          if (this.property?.id !== propertyId) {
            return;
          }

          this.events = [];
          this.eventsErrorMessage = this.extractErrorMessage(
            error,
            'No se pudo cargar el historial de eventos.'
          );
        }
      });
  }

  private buildCreateEventPayload(propertyId: number): CreatePropertyEventPayload {
    const payload: CreatePropertyEventPayload = {
      tipo: this.eventFormModel.tipo.trim(),
      descripcion: this.composeDescription(),
      propiedad: {
        id: propertyId
      }
    };

    if (this.eventFormModel.fecha) {
      payload.fecha = this.toLocalDateIso(this.eventFormModel.fecha);
    }

    if (this.eventFormModel.url.trim()) {
      payload.url = this.eventFormModel.url.trim();
    }

    return payload;
  }

  private composeDescription(): string {
    const description = this.eventFormModel.descripcion.trim();
    const observations = this.eventFormModel.observaciones.trim();

    return observations ? `${description}\n\nObservaciones: ${observations}` : description;
  }

  private toLocalDateIso(rawDate: string): string {
    const [year, month, day] = rawDate.split('-').map(Number);
    return new Date(year, month - 1, day).toISOString();
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private resetEventFeedback(): void {
    this.eventsErrorMessage = '';
    this.eventFormErrorMessage = '';
  }

  private resetEventForm(): void {
    this.eventFormModel.tipo = 'visita';
    this.eventFormModel.fecha = '';
    this.eventFormModel.descripcion = '';
    this.eventFormModel.observaciones = '';
    this.eventFormModel.url = '';
    this.resetEventFeedback();
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessage =
        (typeof error.error === 'string' && error.error) ||
        error.error?.message ||
        error.error?.error;

      if (typeof backendMessage === 'string' && backendMessage.trim()) {
        return backendMessage;
      }

      if (error.status === 400) {
        return 'La propiedad seleccionada no es válida para registrar el evento.';
      }
    }

    return fallback;
  }
}
