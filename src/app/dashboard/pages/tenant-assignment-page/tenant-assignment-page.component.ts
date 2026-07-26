import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { switchMap } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { Arriendo, ArriendoPayload, DiaPago } from '../../models/arriendo.model';
import { PropertyRecord } from '../../models/property.model';
import { ArriendosService } from '../../services/arriendos.service';
import { ContactManagementService } from '../../services/contact-management.service';
import { PropertyManagementService } from '../../services/property-management.service';

interface TenantRecord {
  id: string;
  fullName: string;
  phone: string;
}

interface SavedAssignmentSummary {
  arriendo: Arriendo;
  propertyAddress: string;
  tenantName: string;
}

interface AssignmentFormValue {
  propertyId: number | null;
  tenantId: string;
  monthlyRent: number | null;
  guaranteeMonths: number | null;
  startDate: string;
  endDate: string;
  paymentDay: number | null;
  semiannualAdjustment: number | null;
}

const EMPTY_FORM: AssignmentFormValue = {
  propertyId: null,
  tenantId: '',
  monthlyRent: null,
  guaranteeMonths: null,
  startDate: '',
  endDate: '',
  paymentDay: null,
  semiannualAdjustment: null
};

const DIA_PAGO_BY_DAY: Partial<Record<number, DiaPago>> = {
  5: DiaPago.DIA_5,
  10: DiaPago.DIA_10,
  15: DiaPago.DIA_15,
  20: DiaPago.DIA_20,
  25: DiaPago.DIA_25,
  30: DiaPago.DIA_30
};
const RUT_PATTERN = /^\d{7,8}-[\dkK]$/;

@Component({
  selector: 'app-tenant-assignment-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './tenant-assignment-page.component.html',
  styleUrl: './tenant-assignment-page.component.css'
})
export class TenantAssignmentPageComponent implements OnInit {
  private readonly propertyService = inject(PropertyManagementService);
  private readonly contactService = inject(ContactManagementService);
  private readonly arriendosService = inject(ArriendosService);

  readonly allProperties = signal<PropertyRecord[]>([]);
  readonly allTenants = signal<TenantRecord[]>([]);
  readonly savedArriendos = signal<Arriendo[]>([]);
  readonly tenantQuery = signal('');
  readonly formModel = signal<AssignmentFormValue>({ ...EMPTY_FORM });
  readonly feedbackMessage = signal('');
  readonly feedbackType = signal<'success' | 'error' | 'info'>('info');
  readonly isSubmitting = signal(false);
  readonly showAssignments = signal(false);
  readonly confirmedArriendo = signal<Arriendo | null>(null);
  readonly availableProperties = computed(() =>
    this.allProperties().filter((property) => property.disponible)
  );

  readonly filteredTenants = computed(() => {
    const query = this.tenantQuery().trim().toLowerCase();
    if (!query) {
      return this.allTenants();
    }

    return this.allTenants().filter((tenant) =>
      [tenant.fullName, tenant.id].some((field) => field.toLowerCase().includes(query))
    );
  });

  readonly selectedProperty = computed(
    () =>
      this.availableProperties().find((property) => property.id === this.formModel().propertyId) ?? null
  );
  readonly selectedTenant = computed(
    () => this.allTenants().find((tenant) => tenant.id === this.formModel().tenantId) ?? null
  );
  readonly savedAssignments = computed<SavedAssignmentSummary[]>(() =>
    this.savedArriendos()
      .slice()
      .sort((left, right) => right.fechaInicio.localeCompare(left.fechaInicio))
      .map((arriendo) => {
        const property = this.allProperties().find((item) => item.id === arriendo.propiedad.id);
        const tenant = this.allTenants().find((item) => item.id === arriendo.arrendatario.rut);

        return {
          arriendo,
          propertyAddress: property?.direccion ?? `Propiedad #${arriendo.propiedad.id}`,
          tenantName: tenant?.fullName ?? `Arrendatario ${arriendo.arrendatario.rut}`
        };
      })
  );
  readonly hasDateRangeError = computed(() => {
    const values = this.formModel();
    return !!values.startDate && !!values.endDate && values.endDate < values.startDate;
  });

  ngOnInit(): void {
    this.loadAssignments();

    this.propertyService.listProperties().subscribe((properties) => {
      this.allProperties.set(properties);
    });

    this.contactService.listContacts('arrendatarios').subscribe((contacts) => {
      this.allTenants.set(
        contacts.map((contact) => ({
          id: contact.rut,
          fullName: `${contact.nombre} ${contact.apellido}`,
          phone: contact.telefono
        }))
      );
    });
  }

  updateField<K extends keyof AssignmentFormValue>(field: K, value: AssignmentFormValue[K]): void {
    this.formModel.update((current) => ({ ...current, [field]: value }));
    if (field === 'propertyId' && typeof value === 'number') {
      this.confirmedArriendo.set(this.findActiveArriendoByPropertyId(value));
    }
  }

  confirmAssignment(form: NgForm): void {
    form.control.markAllAsTouched();
    if (form.invalid || this.hasDateRangeError()) {
      this.feedbackType.set('error');
      this.feedbackMessage.set('Revisa los campos obligatorios antes de confirmar la asignación.');
      return;
    }

    const property = this.selectedProperty();
    const tenant = this.selectedTenant();
    const values = this.formModel();

    if (!property || !tenant) {
      this.feedbackType.set('error');
      this.feedbackMessage.set('Debes seleccionar una propiedad y un arrendatario.');
      return;
    }

    const validationResult = this.validateArriendoValues(values, tenant.id);
    if ('message' in validationResult) {
      this.feedbackType.set('error');
      this.feedbackMessage.set(validationResult.message);
      return;
    }

    const payload = this.buildArriendoPayload(
      property.id,
      tenant.id,
      values.startDate,
      validationResult.diaPago,
      validationResult.adjustment
    );
    const existingArriendo = this.findActiveArriendoByPropertyId(property.id);

    this.isSubmitting.set(true);
    this.feedbackMessage.set('');

    this.propertyService
      .updateProperty(property.id, { ...property, disponible: false })
      .pipe(
        switchMap((assignedProperty) => {
          this.allProperties.update((properties) =>
            properties.map((item) =>
              item.id === assignedProperty.id ? { ...assignedProperty, disponible: false } : item
            )
          );

          if (existingArriendo?.id) {
            return this.arriendosService.update(existingArriendo.id, payload);
          }

          return this.arriendosService.create(payload);
        })
      )
      .subscribe({
        next: (savedArriendo) => {
          this.confirmedArriendo.set(savedArriendo);
          this.savedArriendos.update((arriendos) => {
            const remaining = arriendos.filter((item) => item.id !== savedArriendo.id);
            return [savedArriendo, ...remaining];
          });
          this.isSubmitting.set(false);
          this.feedbackType.set('success');
          this.feedbackMessage.set(
            `✓ Asignación confirmada: ${tenant.fullName} en ${property.direccion}.`
          );
        },
        error: (err: unknown) => {
          this.isSubmitting.set(false);
          this.feedbackType.set('error');
          this.feedbackMessage.set(this.buildApiErrorMessage(err));
        }
      });
  }

  saveDraft(): void {
    this.feedbackType.set('info');
    this.feedbackMessage.set('Borrador guardado. Puedes continuar la asignación más tarde.');
  }

  toggleAssignmentsList(): void {
    this.showAssignments.update((current) => !current);
  }

  cancelProcess(form: NgForm): void {
    this.formModel.set({ ...EMPTY_FORM });
    this.tenantQuery.set('');
    this.confirmedArriendo.set(null);
    this.feedbackType.set('info');
    this.feedbackMessage.set('Proceso cancelado.');
    form.resetForm({ ...EMPTY_FORM });
  }

  resetDemo(form: NgForm): void {
    this.formModel.set({ ...EMPTY_FORM });
    this.tenantQuery.set('');
    this.confirmedArriendo.set(null);
    this.feedbackType.set('info');
    this.feedbackMessage.set('Formulario reiniciado.');
    form.resetForm({ ...EMPTY_FORM });
  }

  private loadAssignments(): void {
    this.arriendosService.list().subscribe({
      next: (arriendos) => {
        this.savedArriendos.set(arriendos);
      },
      error: (err: unknown) => {
        this.savedArriendos.set([]);
        this.feedbackType.set('error');
        this.feedbackMessage.set(`No se pudieron cargar los arriendos: ${this.buildApiErrorMessage(err)}`);
      }
    });
  }

  private findActiveArriendoByPropertyId(propiedadId: number): Arriendo | null {
    return (
      this.savedArriendos().find((arriendo) => arriendo.propiedad.id === propiedadId && arriendo.activo) ??
      null
    );
  }

  private validateArriendoValues(
    values: AssignmentFormValue,
    tenantRut: string
  ): { message: string } | { diaPago: DiaPago; adjustment: number } {
    if (!RUT_PATTERN.test(tenantRut)) {
      return { message: 'El RUT del arrendatario debe incluir guion (ejemplo: 12345678-9).' };
    }

    const adjustment = values.semiannualAdjustment;
    if (adjustment === null || !Number.isInteger(adjustment) || adjustment < 1 || adjustment > 100) {
      return { message: 'El reajuste semestral debe ser un número entero entre 1 y 100.' };
    }

    const diaPago = this.mapDiaPago(values.paymentDay);
    if (!diaPago) {
      return {
        message: 'El día de pago debe ser uno de los valores permitidos: 5, 10, 15, 20, 25 o 30.'
      };
    }

    return { diaPago, adjustment };
  }

  private buildArriendoPayload(
    propiedadId: number,
    arrendatarioRut: string,
    fechaInicio: string,
    diaPago: DiaPago,
    reajusteSemestral: number
  ): ArriendoPayload {
    return {
      propiedad: { id: propiedadId },
      arrendatario: { rut: arrendatarioRut },
      fechaInicio,
      diaPago,
      reajusteSemestral,
      activo: true
    };
  }

  private mapDiaPago(paymentDay: number | null): DiaPago | null {
    if (paymentDay === null) {
      return null;
    }

    return DIA_PAGO_BY_DAY[paymentDay] ?? null;
  }

  private buildApiErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 400) {
        return 'Solicitud inválida. Revisa día de pago, RUT y reajuste semestral.';
      }

      if (err.status === 404) {
        return 'No se encontró el recurso solicitado para esta asignación.';
      }

      if (err.status >= 500) {
        return 'El servidor presentó un error. Inténtalo nuevamente.';
      }

      return `Error HTTP ${err.status}.`;
    }

    if (err instanceof Error) {
      return err.message;
    }

    return 'Error al comunicarse con el servidor.';
  }
}
