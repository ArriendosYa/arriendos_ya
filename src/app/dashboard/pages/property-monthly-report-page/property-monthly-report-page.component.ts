import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { ContactRecord } from '../../models/contact.model';
import {
  ReporteEvento,
  ReporteMensualPropiedad,
  ReporteMovimiento
} from '../../models/reporte-mensual-propiedad.model';
import { PropertyRecord } from '../../models/property.model';
import { ContactManagementService } from '../../services/contact-management.service';
import { PropertyManagementService } from '../../services/property-management.service';
import { ReporteMensualPropiedadService } from '../../services/reporte-mensual-propiedad.service';

const MONTH_OPTIONS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

@Component({
  selector: 'app-property-monthly-report-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './property-monthly-report-page.component.html',
  styleUrl: './property-monthly-report-page.component.css'
})
export class PropertyMonthlyReportPageComponent {
  private readonly propertyService = inject(PropertyManagementService);
  private readonly ownerService = inject(ContactManagementService);
  private readonly reportService = inject(ReporteMensualPropiedadService);

  readonly monthOptions = MONTH_OPTIONS;
  readonly currentYear = new Date().getFullYear();
  readonly properties = signal<PropertyRecord[]>([]);
  readonly owners = signal<ContactRecord[]>([]);
  readonly selectedPropertyId = signal<number | null>(null);
  readonly selectedMes = signal<number>(new Date().getMonth() + 1);
  readonly selectedAnio = signal<number>(new Date().getFullYear());
  readonly destinatariosInput = signal('');
  readonly report = signal<ReporteMensualPropiedad | null>(null);

  readonly isLoadingProperties = signal(false);
  readonly isLoadingReport = signal(false);
  readonly isSending = signal(false);

  readonly queryError = signal('');
  readonly sendError = signal('');
  readonly successMessage = signal('');

  readonly isLoading = computed(() => this.isLoadingProperties() || this.isLoadingReport());
  readonly selectedProperty = computed(
    () => this.properties().find((property) => property.id === this.selectedPropertyId()) ?? null
  );

  constructor() {
    this.loadProperties();
    this.loadOwners();
  }

  updateSelectedProperty(rawValue: string | number | null): void {
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value <= 0) {
      this.selectedPropertyId.set(null);
      this.destinatariosInput.set('');
      return;
    }

    this.selectedPropertyId.set(value);
    this.fillDestinatariosWithOwnerEmail();
  }

  consultarReporte(): void {
    const validationError = this.validateFilters();
    if (validationError) {
      this.queryError.set(validationError);
      return;
    }

    this.queryError.set('');
    this.sendError.set('');
    this.successMessage.set('');
    this.report.set(null);
    this.isLoadingReport.set(true);

    this.reportService
      .getReporteMensual(this.selectedPropertyId()!, this.selectedAnio(), this.selectedMes())
      .pipe(finalize(() => this.isLoadingReport.set(false)))
      .subscribe({
        next: (report) => {
          this.report.set(report);
        },
        error: (error) => {
          this.queryError.set(
            this.extractErrorMessage(error, 'No se pudo cargar el reporte mensual de la propiedad.')
          );
        }
      });
  }

  enviarReporte(): void {
    const validationError = this.validateFilters();
    if (validationError) {
      this.sendError.set(validationError);
      return;
    }

    const destinatarios = this.parseDestinatarios(this.destinatariosInput());
    if (!destinatarios.length) {
      this.sendError.set('Debes indicar al menos un correo destinatario.');
      return;
    }

    if (destinatarios.some((email) => !this.isEmailValid(email))) {
      this.sendError.set('Uno o más correos de destinatarios no tienen un formato válido.');
      return;
    }

    this.sendError.set('');
    this.successMessage.set('');
    this.isSending.set(true);

    this.reportService
      .enviarReporteMensual(this.selectedPropertyId()!, this.selectedAnio(), this.selectedMes(), {
        destinatarios
      })
      .pipe(finalize(() => this.isSending.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Reporte enviado exitosamente al propietario.');
        },
        error: (error) => {
          this.sendError.set(
            this.extractErrorMessage(error, 'No se pudo enviar el reporte. Intenta nuevamente.')
          );
        }
      });
  }

  trackByMovimiento(_: number, movimiento: ReporteMovimiento): number {
    return movimiento.id;
  }

  trackByEvento(_: number, evento: ReporteEvento): number {
    return evento.id;
  }

  private loadProperties(): void {
    this.isLoadingProperties.set(true);

    this.propertyService
      .listProperties()
      .pipe(finalize(() => this.isLoadingProperties.set(false)))
      .subscribe({
        next: (properties) => {
          this.properties.set(properties);
          if (!this.selectedPropertyId() && properties.length) {
            this.selectedPropertyId.set(properties[0].id);
            this.fillDestinatariosWithOwnerEmail();
          }
        },
        error: () => {
          this.queryError.set('No se pudieron cargar las propiedades disponibles.');
        }
      });
  }

  private loadOwners(): void {
    this.ownerService.listContacts('propietarios').subscribe({
      next: (owners) => {
        this.owners.set(owners);
        this.fillDestinatariosWithOwnerEmail();
      },
      error: () => {
        this.sendError.set('No se pudieron cargar los correos de propietarios.');
      }
    });
  }

  private fillDestinatariosWithOwnerEmail(): void {
    const property = this.selectedProperty();
    if (!property) {
      return;
    }

    const ownerEmail = this.owners().find((owner) => owner.rut === property.propietario.rut)?.email?.trim();
    this.destinatariosInput.set(ownerEmail || '');
  }

  private validateFilters(): string {
    if (!this.selectedPropertyId()) {
      return 'Debes seleccionar una propiedad.';
    }

    if (!Number.isInteger(this.selectedMes()) || this.selectedMes() < 1 || this.selectedMes() > 12) {
      return 'El mes debe estar entre 1 y 12.';
    }

    if (!Number.isInteger(this.selectedAnio()) || this.selectedAnio() <= 0) {
      return 'Debes indicar un año válido.';
    }

    return '';
  }

  private parseDestinatarios(raw: string): string[] {
    return raw
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
  }

  private isEmailValid(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const payload = (error as { error?: unknown })?.error;

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const message = (payload as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }

      if (Array.isArray(message) && message.length) {
        return message.filter((item) => typeof item === 'string').join(' · ') || fallback;
      }
    }

    const fallbackMessage = (error as { message?: unknown })?.message;
    if (typeof fallbackMessage === 'string' && fallbackMessage.trim()) {
      return fallbackMessage;
    }

    return fallback;
  }
}
