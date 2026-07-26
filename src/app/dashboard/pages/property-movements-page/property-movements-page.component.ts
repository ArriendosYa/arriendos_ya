import { CommonModule } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, of, switchMap } from 'rxjs';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { TopbarComponent } from '../../components/topbar/topbar.component';
import {
  MovimientoListResponse,
  MOVIMIENTO_TIPOS,
  MovimientoPayload,
  MovimientoRecord,
  MovimientoTipo
} from '../../models/movimiento.model';
import { PropertyRecord } from '../../models/property.model';
import { MovimientoService } from '../../services/movimiento.service';
import { PropertyManagementService } from '../../services/property-management.service';

interface MovimientoFormModel {
  tipo: MovimientoTipo;
  concepto: string;
  monto: number | null;
  fecha: string;
  estado: string;
}

const EMPTY_MOVIMIENTO_FORM: MovimientoFormModel = {
  tipo: 'INGRESO',
  concepto: '',
  monto: null,
  fecha: '',
  estado: ''
};

@Component({
  selector: 'app-property-movements-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, TopbarComponent],
  templateUrl: './property-movements-page.component.html',
  styleUrl: './property-movements-page.component.css'
})
export class PropertyMovementsPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly propertyService = inject(PropertyManagementService);
  private readonly movimientoService = inject(MovimientoService);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  readonly movimientoTipos = MOVIMIENTO_TIPOS;
  readonly propiedadId = signal<number>(0);
  readonly property = signal<PropertyRecord | null>(null);
  readonly movimientos = signal<MovimientoRecord[]>([]);
  readonly formModel = signal<MovimientoFormModel>({ ...EMPTY_MOVIMIENTO_FORM });
  readonly editingMovimientoId = signal<number | null>(null);
  readonly selectedFile = signal<File | null>(null);
  readonly totalIngresos = signal(0);
  readonly totalEgresos = signal(0);
  readonly saldo = signal(0);

  readonly isLoadingProperty = signal(false);
  readonly isLoadingMovimientos = signal(false);
  readonly isSaving = signal(false);
  readonly deletingMovimientoId = signal<number | null>(null);
  readonly isDragOver = signal(false);
  readonly comprobanteModalUrl = signal<string | null>(null);

  readonly propertyError = signal('');
  readonly movimientosError = signal('');
  readonly formError = signal('');
  readonly successMessage = signal('');

  readonly isLoading = computed(() => this.isLoadingProperty() || this.isLoadingMovimientos());
  readonly isEditing = computed(() => this.editingMovimientoId() !== null);
  readonly isComprobanteModalOpen = computed(() => !!this.comprobanteModalUrl());

  constructor() {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = Number(raw);

    if (!raw || !Number.isInteger(id) || id <= 0) {
      this.router.navigate(['/propiedades']);
      return;
    }

    this.propiedadId.set(id);
    this.loadProperty(id);
    this.loadMovimientos(id);
  }

  goBack(): void {
    this.router.navigate(['/propiedades']);
  }

  updateFormField<K extends keyof MovimientoFormModel>(field: K, value: MovimientoFormModel[K]): void {
    this.formModel.update((current) => ({ ...current, [field]: value }));
  }

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;
    this.setFile(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(false);
    const file = event.dataTransfer?.files?.item(0) ?? null;
    this.setFile(file);
  }

  clearSelectedFile(): void {
    this.selectedFile.set(null);
    const fileInput = this.fileInput()?.nativeElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  startEdit(movimiento: MovimientoRecord): void {
    this.editingMovimientoId.set(movimiento.id ?? null);
    this.formModel.set({
      tipo: movimiento.tipo,
      concepto: movimiento.concepto,
      monto: movimiento.monto,
      fecha: movimiento.fecha,
      estado: movimiento.estado ?? ''
    });
    this.clearSelectedFile();
    this.formError.set('');
    this.successMessage.set('');
  }

  resetForm(): void {
    this.editingMovimientoId.set(null);
    this.formModel.set({ ...EMPTY_MOVIMIENTO_FORM });
    this.clearSelectedFile();
    this.formError.set('');
  }

  saveMovimiento(): void {
    const current = this.formModel();
    const validationError = this.validateForm(current);

    if (validationError) {
      this.formError.set(validationError);
      return;
    }

    this.isSaving.set(true);
    this.formError.set('');
    this.successMessage.set('');

    const payload: MovimientoPayload = {
      tipo: current.tipo,
      concepto: current.concepto.trim(),
      monto: Number(current.monto),
      propiedad: { id: this.propiedadId() },
      ...(current.fecha ? { fecha: current.fecha } : {}),
      ...(current.estado.trim() ? { estado: current.estado.trim() } : {})
    };

    const movimientoId = this.editingMovimientoId();
    const request$ = movimientoId
      ? this.movimientoService.updateMovimiento(movimientoId, payload).pipe(
          switchMap((updated) => {
            const file = this.selectedFile();
            if (!file) {
              return of(updated);
            }

            return this.movimientoService.updateComprobante(movimientoId, file);
          })
        )
      : this.movimientoService.createConComprobante(payload, this.selectedFile());

    request$
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.resetForm();
          this.loadMovimientos(this.propiedadId());
          this.successMessage.set(
            movimientoId
              ? 'Movimiento actualizado exitosamente.'
              : 'Movimiento registrado exitosamente.'
          );
        },
        error: (error) => {
          this.formError.set(
            this.extractErrorMessage(error, 'No se pudo guardar el movimiento. Intenta nuevamente.')
          );
        }
      });
  }

  viewComprobante(url: string): void {
    if (!url.trim()) {
      return;
    }

    this.comprobanteModalUrl.set(url);
  }

  closeComprobanteModal(): void {
    this.comprobanteModalUrl.set(null);
  }

  deleteMovimiento(movimiento: MovimientoRecord): void {
    if (!movimiento.id) {
      return;
    }

    if (!confirm(`¿Eliminar el movimiento "${movimiento.concepto}"?`)) {
      return;
    }

    this.deletingMovimientoId.set(movimiento.id);
    this.movimientosError.set('');

    this.movimientoService
      .deleteMovimiento(movimiento.id)
      .pipe(finalize(() => this.deletingMovimientoId.set(null)))
      .subscribe({
        next: () => {
          if (this.editingMovimientoId() === movimiento.id) {
            this.resetForm();
          }
          this.loadMovimientos(this.propiedadId());
          this.successMessage.set('Movimiento eliminado exitosamente.');
        },
        error: (error) => {
          this.movimientosError.set(
            this.extractErrorMessage(error, 'No se pudo eliminar el movimiento. Intenta nuevamente.')
          );
        }
      });
  }

  trackByMovimiento(index: number, movimiento: MovimientoRecord): number {
    return movimiento.id ?? index;
  }

  private setFile(file: File | null): void {
    this.selectedFile.set(file);
  }

  private loadProperty(id: number): void {
    this.isLoadingProperty.set(true);
    this.propertyError.set('');

    this.propertyService
      .getProperty(id)
      .pipe(finalize(() => this.isLoadingProperty.set(false)))
      .subscribe({
        next: (property) => this.property.set(property),
        error: (error) => {
          this.propertyError.set(
            this.extractErrorMessage(error, 'No se pudo cargar la propiedad seleccionada.')
          );
        }
      });
  }

  private loadMovimientos(propiedadId: number): void {
    this.isLoadingMovimientos.set(true);
    this.movimientosError.set('');

    this.movimientoService
      .listByPropiedad(propiedadId)
      .pipe(finalize(() => this.isLoadingMovimientos.set(false)))
      .subscribe({
        next: (response) => this.applyMovimientosResponse(response),
        error: (error) => {
          this.movimientosError.set(
            this.extractErrorMessage(error, 'No se pudieron cargar los movimientos.')
          );
        }
      });
  }

  private applyMovimientosResponse(response: MovimientoListResponse): void {
    this.movimientos.set(response.movimientos ?? []);
    this.totalIngresos.set(response.totalIngresos ?? 0);
    this.totalEgresos.set(response.totalEgresos ?? 0);
    this.saldo.set(response.saldo ?? 0);
  }

  private validateForm(model: MovimientoFormModel): string {
    if (!model.tipo) {
      return 'Debes seleccionar el tipo de movimiento.';
    }

    if (!model.concepto.trim()) {
      return 'El concepto es obligatorio.';
    }

    if (model.monto === null || Number.isNaN(Number(model.monto)) || Number(model.monto) <= 0) {
      return 'El monto debe ser un número mayor a 0.';
    }

    return '';
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
