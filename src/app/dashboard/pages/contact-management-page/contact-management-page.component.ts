import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { ContactRecord, ContactResource } from '../../models/contact.model';
import { ContactManagementService } from '../../services/contact-management.service';

const EMPTY_CONTACT: ContactRecord = {
  rut: '',
  nombre: '',
  apellido: '',
  telefono: '',
  email: ''
};
const EMAIL_PATTERN =
  /^(?=.{1,254}$)(?=.{1,64}@)[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+(\.[-!#$%&'*+/0-9=?A-Z^_`a-z{|}~]+)*@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

type ContactCollection = Record<ContactResource, ContactRecord[]>;
const PAGE_SIZE = 5;

@Component({
  selector: 'app-contact-management-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './contact-management-page.component.html',
  styleUrl: './contact-management-page.component.css'
})
export class ContactManagementPageComponent {
  private readonly contactService = inject(ContactManagementService);

  readonly pageSize = PAGE_SIZE;
  readonly activeTab = signal<ContactResource>('propietarios');
  readonly contacts = signal<ContactCollection>({
    propietarios: [],
    arrendatarios: []
  });
  readonly currentPage = signal(1);
  readonly selectedRut = signal<string | null>(null);
  readonly formModel = signal<ContactRecord>({ ...EMPTY_CONTACT });
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly currentContacts = computed(() => this.contacts()[this.activeTab()]);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.currentContacts().length / this.pageSize))
  );
  readonly pagedContacts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.currentContacts().slice(start, start + this.pageSize);
  });
  readonly rangeStart = computed(() =>
    this.currentContacts().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0
  );
  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.currentContacts().length)
  );
  readonly isEditing = computed(() => this.selectedRut() !== null);
  readonly tabTitle = computed(() =>
    this.activeTab() === 'propietarios' ? 'Propietarios' : 'Arrendatarios'
  );
  readonly entityLabel = computed(() =>
    this.activeTab() === 'propietarios' ? 'Propietario' : 'Arrendatario'
  );

  constructor() {
    this.loadContacts('propietarios');

    effect(() => {
      const totalPages = this.totalPages();

      if (this.currentPage() > totalPages) {
        this.currentPage.set(totalPages);
      }
    });
  }

  trackByRut(_: number, contact: ContactRecord): string {
    return contact.rut;
  }

  getFullName(contact: ContactRecord): string {
    return `${contact.nombre} ${contact.apellido}`.trim();
  }

  setTab(resource: ContactResource): void {
    if (resource === this.activeTab()) {
      return;
    }

    this.activeTab.set(resource);
    this.currentPage.set(1);
    this.clearForm();

    if (!this.contacts()[resource].length) {
      this.loadContacts(resource);
    }
  }

  selectContact(contact: ContactRecord): void {
    this.selectedRut.set(contact.rut);
    this.formModel.set({ ...contact });
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  clearForm(form?: NgForm): void {
    this.selectedRut.set(null);
    this.formModel.set({ ...EMPTY_CONTACT });
    this.errorMessage.set('');
    this.successMessage.set('');
    form?.resetForm({ ...EMPTY_CONTACT });
  }

  updateField<K extends keyof ContactRecord>(field: K, value: ContactRecord[K]): void {
    this.formModel.update((current) => ({ ...current, [field]: value }));
  }

  isRutValid(value: string): boolean {
    return isValidChileanRut(value);
  }

  hasRutValidationError(form: NgForm): boolean {
    const control = form.controls['rut'];
    return !!control && control.touched && !this.isRutValid(this.formModel().rut);
  }

  isEmailValid(value: string): boolean {
    const trimmedValue = value.trim();
    return EMAIL_PATTERN.test(trimmedValue);
  }

  hasEmailValidationError(form: NgForm): boolean {
    const control = form.controls?.['email'];
    return !!control && control.touched && !this.isEmailValid(control.value ?? '');
  }

  saveContact(form: NgForm): void {
    form.control.markAllAsTouched();

    if (form.invalid || !this.isRutValid(this.formModel().rut) || !this.isEmailValid(this.formModel().email)) {
      return;
    }

    const resource = this.activeTab();
    const payload = this.formModel();
    const selectedRut = this.selectedRut();
    const request$ = selectedRut
      ? this.contactService.updateContact(resource, selectedRut, payload)
      : this.contactService.createContact(resource, payload);

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: () => {
        this.clearForm(form);
        this.successMessage.set(
          selectedRut
            ? `${this.entityLabel()} actualizado correctamente.`
            : `${this.entityLabel()} creado correctamente.`
        );
        this.loadContacts(resource);
      },
      error: () => {
        this.errorMessage.set('No se pudo guardar el registro. Intenta nuevamente.');
      }
    });
  }

  deleteContact(): void {
    const resource = this.activeTab();
    const rut = this.selectedRut();

    if (!rut) {
      return;
    }

    this.isDeleting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.contactService
      .deleteContact(resource, rut)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          this.clearForm();
          this.successMessage.set(`${this.entityLabel()} eliminado correctamente.`);
          this.loadContacts(resource);
        },
        error: () => {
          this.errorMessage.set('No se pudo eliminar el registro. Intenta nuevamente.');
        }
      });
  }

  private loadContacts(resource: ContactResource): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.contactService
      .listContacts(resource)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (contacts) => {
          this.contacts.update((current) => ({ ...current, [resource]: contacts }));
          if (resource === this.activeTab() && this.selectedRut()) {
            const selected = contacts.find((contact) => contact.rut === this.selectedRut());
            if (!selected) {
              this.clearForm();
            }
          }
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar los contactos.');
        }
      });
  }

  previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }
}

function isValidChileanRut(value: string): boolean {
  const normalized = value.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();

  if (!/^\d{1,8}[0-9K]$/.test(normalized)) {
    return false;
  }

  const body = normalized.slice(0, -1);
  const verifier = normalized.slice(-1);

  let sum = 0;
  let multiplier = 2;

  for (let digitIndex = body.length - 1; digitIndex >= 0; digitIndex -= 1) {
    sum += Number(body[digitIndex]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expectedVerifier =
    remainder === 11 ? '0' : remainder === 10 ? 'K' : remainder.toString();

  return verifier === expectedVerifier;
}
