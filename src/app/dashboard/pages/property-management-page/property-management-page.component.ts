import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { PropertyDetailPanelComponent } from '../../components/property-detail-panel/property-detail-panel.component';
import { PropertyManagementFiltersComponent } from '../../components/property-management-filters/property-management-filters.component';
import { PropertyManagementTableComponent } from '../../components/property-management-table/property-management-table.component';
import { ContactRecord } from '../../models/contact.model';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import { PropertyFilters, PropertyRecord } from '../../models/property.model';
import { ContactManagementService } from '../../services/contact-management.service';
import { PropertyManagementService } from '../../services/property-management.service';

const DEFAULT_FILTERS: PropertyFilters = {
  disponible: 'Todos',
  comuna: 'Todas'
};

const EMPTY_PROPERTY: PropertyRecord = {
  id: 0,
  direccion: '',
  comuna: '',
  ciudad: '',
  region: '',
  numeroHabitaciones: 0,
  numeroBanos: 0,
  precioArriendo: 0,
  disponible: true,
  propietario: { rut: '' }
};

@Component({
  selector: 'app-property-management-page',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    TopbarComponent,
    PropertyManagementFiltersComponent,
    PropertyManagementTableComponent,
    PropertyDetailPanelComponent
  ],
  templateUrl: './property-management-page.component.html',
  styleUrl: './property-management-page.component.css'
})
export class PropertyManagementPageComponent {
  private readonly propertyService = inject(PropertyManagementService);
  private readonly contactService = inject(ContactManagementService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pageSize = 5;
  readonly properties = signal<PropertyRecord[]>([]);
  readonly filters = signal<PropertyFilters>(DEFAULT_FILTERS);
  readonly currentPage = signal(1);
  readonly selectedPropertyId = signal<number | null>(null);
  readonly isCreating = signal(false);
  readonly isLoading = signal(false);
  readonly isSaving = signal(false);
  readonly isDeleting = signal(false);
  readonly errorMessage = signal('');
  readonly owners = signal<ContactRecord[]>([]);

  readonly comunas = computed(() => Array.from(new Set(this.properties().map((p) => p.comuna))));

  readonly filteredProperties = computed(() =>
    this.properties().filter((property) => {
      const filters = this.filters();

      return (
        (filters.disponible === 'Todos' || property.disponible === filters.disponible) &&
        (filters.comuna === 'Todas' || property.comuna === filters.comuna)
      );
    })
  );

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProperties().length / this.pageSize))
  );

  readonly pagedProperties = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredProperties().slice(start, start + this.pageSize);
  });

  readonly selectedProperty = computed(
    () =>
      this.filteredProperties().find((property) => property.id === this.selectedPropertyId()) ??
      null
  );

  readonly panelProperty = computed<PropertyRecord | null>(() => {
    if (this.isCreating()) return { ...EMPTY_PROPERTY };
    return this.selectedProperty();
  });

  readonly rangeStart = computed(() =>
    this.filteredProperties().length ? (this.currentPage() - 1) * this.pageSize + 1 : 0
  );

  readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * this.pageSize, this.filteredProperties().length)
  );

  constructor() {
    this.loadProperties();
    this.loadOwners();

    effect(() => {
      const totalPages = this.totalPages();

      if (this.currentPage() > totalPages) {
        this.currentPage.set(totalPages);
      }
    });
  }

  updateFilters(filters: PropertyFilters): void {
    this.filters.set(filters);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.filters.set(DEFAULT_FILTERS);
    this.currentPage.set(1);
  }

  selectProperty(property: PropertyRecord): void {
    this.selectedPropertyId.set(property.id);
    this.isCreating.set(false);
    this.errorMessage.set('');
  }

  newProperty(): void {
    this.selectedPropertyId.set(null);
    this.isCreating.set(true);
    this.errorMessage.set('');
  }

  previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  saveProperty(property: PropertyRecord): void {
    const ownerRut = property.propietario?.rut?.trim();
    if (!ownerRut) {
      this.errorMessage.set('Debes seleccionar un propietario para la propiedad.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    const payload = {
      direccion: property.direccion,
      comuna: property.comuna,
      ciudad: property.ciudad,
      region: property.region,
      numeroHabitaciones: property.numeroHabitaciones,
      numeroBanos: property.numeroBanos,
      precioArriendo: property.precioArriendo,
      disponible: property.disponible,
      propietario: { rut: ownerRut }
    };

    const request$ =
      property.id === 0
        ? this.propertyService.createProperty(payload)
        : this.propertyService.updateProperty(property.id, { id: property.id, ...payload });

    request$.pipe(finalize(() => this.isSaving.set(false))).subscribe({
      next: (saved) => {
        this.isCreating.set(false);
        this.selectedPropertyId.set(saved.id);
        this.loadProperties();
      },
      error: () => {
        this.errorMessage.set('No se pudo guardar la propiedad. Intenta nuevamente.');
      }
    });
  }

  deleteProperty(property: PropertyRecord): void {
    this.isDeleting.set(true);
    this.errorMessage.set('');

    this.propertyService
      .deleteProperty(property.id)
      .pipe(finalize(() => this.isDeleting.set(false)))
      .subscribe({
        next: () => {
          if (this.selectedPropertyId() === property.id) {
            this.selectedPropertyId.set(null);
          }
          this.loadProperties();
        },
        error: () => {
          this.errorMessage.set('No se pudo eliminar la propiedad. Intenta nuevamente.');
        }
      });
  }

  private loadProperties(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.propertyService
      .listProperties()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (properties) => {
          this.properties.set(properties);
        },
        error: () => {
          this.errorMessage.set('No se pudieron cargar las propiedades.');
        }
      });
  }

  private loadOwners(): void {
    this.contactService
      .listContacts('propietarios')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (owners) => this.owners.set(owners),
        error: () => {
          this.errorMessage.set(
            'No se pudieron cargar los propietarios. Por favor, intenta recargar la página.'
          );
        }
      });
  }
}
