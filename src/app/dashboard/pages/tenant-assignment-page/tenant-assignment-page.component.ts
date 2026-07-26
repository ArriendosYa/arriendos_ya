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

interface OwnerRecord {
  rut: string;
  fullName: string;
}

interface ArriendoRow {
  arriendo: Arriendo;
  propertyAddress: string;
  ownerName: string;
  ownerRut: string;
  tenantName: string;
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

interface EditArriendoFormValue {
  arrendatarioRut: string;
  fechaInicio: string;
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

const EMPTY_EDIT_FORM: EditArriendoFormValue = {
  arrendatarioRut: '',
  fechaInicio: '',
  paymentDay: null,
  semiannualAdjustment: null
};

const ARRIENDOS_PAGE_SIZE = 5;

const DIA_PAGO_BY_DAY: Partial<Record<number, DiaPago>> = {
  5: DiaPago.DIA_5,
  10: DiaPago.DIA_10,
  15: DiaPago.DIA_15,
  20: DiaPago.DIA_20,
  25: DiaPago.DIA_25,
  30: DiaPago.DIA_30
};

const DAY_BY_DIA_PAGO: Partial<Record<DiaPago, number>> = {
  [DiaPago.DIA_5]: 5,
  [DiaPago.DIA_10]: 10,
  [DiaPago.DIA_15]: 15,
  [DiaPago.DIA_20]: 20,
  [DiaPago.DIA_25]: 25,
  [DiaPago.DIA_30]: 30
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

  // ── Shared state ─────────────────────────────────────────────────────────
  readonly allProperties = signal<PropertyRecord[]>([]);
  readonly allTenants = signal<TenantRecord[]>([]);
  readonly allOwners = signal<OwnerRecord[]>([]);
  readonly savedArriendos = signal<Arriendo[]>([]);

  // ── Tab control ──────────────────────────────────────────────────────────
  readonly activeTab = signal<'asignar' | 'arriendos'>('asignar');

  // ── Tab 1: Assignment form state ─────────────────────────────────────────
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

  // ── Tab 2: Arriendos list state ───────────────────────────────────────────
  readonly arriendosFilterTenant = signal('');
  readonly arriendosFilterOwner = signal('');
  readonly arriendosPage = signal(1);
  readonly listFeedbackMessage = signal('');
  readonly listFeedbackType = signal<'success' | 'error' | 'info'>('info');

  // Edit dialog state
  readonly editingArriendo = signal<Arriendo | null>(null);
  readonly editFormModel = signal<EditArriendoFormValue>({ ...EMPTY_EDIT_FORM });
  readonly isUpdating = signal(false);
  readonly showEditConfirm = signal(false);

  // Finalize dialog state
  readonly finalizingArriendo = signal<Arriendo | null>(null);
  readonly finalizeDate = signal('');
  readonly isFinalizing = signal(false);
  readonly showFinalizeConfirm = signal(false);

  readonly arriendosRows = computed<ArriendoRow[]>(() =>
    this.savedArriendos().map((arriendo) => {
      const property = this.allProperties().find((p) => p.id === arriendo.propiedad.id);
      const tenant = this.allTenants().find((t) => t.id === arriendo.arrendatario.rut);
      const owner = property
        ? this.allOwners().find((o) => o.rut === property.propietario.rut)
        : null;

      return {
        arriendo,
        propertyAddress: property?.direccion ?? `Propiedad #${arriendo.propiedad.id}`,
        ownerName: owner?.fullName ?? property?.propietario.rut ?? '-',
        ownerRut: property?.propietario.rut ?? '-',
        tenantName: tenant?.fullName ?? arriendo.arrendatario.rut
      };
    })
  );

  readonly filteredArriendosRows = computed(() => {
    const tenantFilter = this.arriendosFilterTenant().trim().toLowerCase();
    const ownerFilter = this.arriendosFilterOwner().trim().toLowerCase();

    return this.arriendosRows().filter((row) => {
      if (tenantFilter) {
        const matches = [row.arriendo.arrendatario.rut, row.tenantName].some((field) =>
          field.toLowerCase().includes(tenantFilter)
        );
        if (!matches) return false;
      }
      if (ownerFilter) {
        const matches = [row.ownerRut, row.ownerName].some((field) =>
          field.toLowerCase().includes(ownerFilter)
        );
        if (!matches) return false;
      }
      return true;
    });
  });

  readonly arriendosTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredArriendosRows().length / ARRIENDOS_PAGE_SIZE))
  );

  readonly pagedArriendosRows = computed(() => {
    const page = this.arriendosPage();
    const start = (page - 1) * ARRIENDOS_PAGE_SIZE;
    return this.filteredArriendosRows().slice(start, start + ARRIENDOS_PAGE_SIZE);
  });

  readonly arriendosRangeStart = computed(() => {
    if (!this.filteredArriendosRows().length) return 0;
    return (this.arriendosPage() - 1) * ARRIENDOS_PAGE_SIZE + 1;
  });

  readonly arriendosRangeEnd = computed(() =>
    Math.min(this.arriendosPage() * ARRIENDOS_PAGE_SIZE, this.filteredArriendosRows().length)
  );

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

    this.contactService.listContacts('propietarios').subscribe((contacts) => {
      this.allOwners.set(
        contacts.map((contact) => ({
          rut: contact.rut,
          fullName: `${contact.nombre} ${contact.apellido}`
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

  // ── Tab control ──────────────────────────────────────────────────────────

  setActiveTab(tab: 'asignar' | 'arriendos'): void {
    this.activeTab.set(tab);
  }

  // ── Tab 2: Arriendos list methods ─────────────────────────────────────────

  arriendosPreviousPage(): void {
    this.arriendosPage.update((p) => Math.max(1, p - 1));
  }

  arriendosNextPage(): void {
    this.arriendosPage.update((p) => Math.min(this.arriendosTotalPages(), p + 1));
  }

  resetArriendosFilters(): void {
    this.arriendosFilterTenant.set('');
    this.arriendosFilterOwner.set('');
    this.arriendosPage.set(1);
  }

  // ── Edit dialog ───────────────────────────────────────────────────────────

  openEditDialog(arriendo: Arriendo): void {
    this.editingArriendo.set(arriendo);
    this.editFormModel.set({
      arrendatarioRut: arriendo.arrendatario.rut,
      fechaInicio: arriendo.fechaInicio,
      paymentDay: DAY_BY_DIA_PAGO[arriendo.diaPago] ?? null,
      semiannualAdjustment: arriendo.reajusteSemestral
    });
    this.showEditConfirm.set(false);
    this.listFeedbackMessage.set('');
  }

  closeEditDialog(): void {
    this.editingArriendo.set(null);
    this.showEditConfirm.set(false);
  }

  updateEditField<K extends keyof EditArriendoFormValue>(
    field: K,
    value: EditArriendoFormValue[K]
  ): void {
    this.editFormModel.update((current) => ({ ...current, [field]: value }));
  }

  requestEditConfirm(): void {
    const form = this.editFormModel();
    const diaPago = this.mapDiaPago(form.paymentDay);
    if (!diaPago || form.semiannualAdjustment === null || !form.fechaInicio || !form.arrendatarioRut) {
      this.listFeedbackType.set('error');
      this.listFeedbackMessage.set('Revisa los campos del formulario antes de continuar.');
      return;
    }
    this.showEditConfirm.set(true);
  }

  confirmEdit(): void {
    const arriendo = this.editingArriendo();
    if (!arriendo?.id) return;

    const form = this.editFormModel();
    const diaPago = this.mapDiaPago(form.paymentDay);
    if (!diaPago || form.semiannualAdjustment === null) return;

    const payload: ArriendoPayload = {
      propiedad: { id: arriendo.propiedad.id },
      arrendatario: { rut: form.arrendatarioRut },
      fechaInicio: form.fechaInicio,
      diaPago,
      reajusteSemestral: form.semiannualAdjustment,
      activo: arriendo.activo
    };

    this.isUpdating.set(true);
    this.arriendosService.update(arriendo.id, payload).subscribe({
      next: (updated) => {
        this.savedArriendos.update((arriendos) =>
          arriendos.map((item) => (item.id === updated.id ? updated : item))
        );
        this.isUpdating.set(false);
        this.editingArriendo.set(null);
        this.showEditConfirm.set(false);
        this.listFeedbackType.set('success');
        this.listFeedbackMessage.set(`✓ Arriendo #${updated.id} modificado correctamente.`);
      },
      error: (err: unknown) => {
        this.isUpdating.set(false);
        this.showEditConfirm.set(false);
        this.listFeedbackType.set('error');
        this.listFeedbackMessage.set(this.buildApiErrorMessage(err));
      }
    });
  }

  // ── Finalize dialog ───────────────────────────────────────────────────────

  openFinalizeDialog(arriendo: Arriendo): void {
    this.finalizingArriendo.set(arriendo);
    this.finalizeDate.set('');
    this.showFinalizeConfirm.set(false);
    this.listFeedbackMessage.set('');
  }

  closeFinalizeDialog(): void {
    this.finalizingArriendo.set(null);
    this.showFinalizeConfirm.set(false);
  }

  requestFinalizeConfirm(): void {
    if (!this.finalizeDate()) {
      this.listFeedbackType.set('error');
      this.listFeedbackMessage.set('Debes ingresar una fecha de término para finalizar el arriendo.');
      return;
    }
    this.showFinalizeConfirm.set(true);
  }

  confirmFinalize(): void {
    const arriendo = this.finalizingArriendo();
    const fecha = this.finalizeDate();
    if (!arriendo?.id || !fecha) return;

    this.isFinalizing.set(true);
    this.arriendosService.finalizar(arriendo.id, fecha).subscribe({
      next: () => {
        this.savedArriendos.update((arriendos) =>
          arriendos.map((item) =>
            item.id === arriendo.id ? { ...item, activo: false, fechaTermino: fecha } : item
          )
        );
        this.isFinalizing.set(false);
        this.finalizingArriendo.set(null);
        this.showFinalizeConfirm.set(false);
        this.listFeedbackType.set('success');
        this.listFeedbackMessage.set(`✓ Arriendo #${arriendo.id} finalizado correctamente.`);
      },
      error: (err: unknown) => {
        this.isFinalizing.set(false);
        this.showFinalizeConfirm.set(false);
        this.listFeedbackType.set('error');
        this.listFeedbackMessage.set(this.buildApiErrorMessage(err));
      }
    });
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
