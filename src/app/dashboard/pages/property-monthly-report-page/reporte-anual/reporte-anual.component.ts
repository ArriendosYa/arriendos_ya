import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ContactRecord } from '../../../models/contact.model';
import {
  PropiedadResumenAnual,
  PropietarioResumenAnual,
  ReporteAnualPropietariosResponse
} from '../../../models/reporte-anual-propietarios.model';
import { ContactManagementService } from '../../../services/contact-management.service';
import { ReporteAnualPropietariosService } from '../../../services/reporte-anual-propietarios.service';

const MONTH_LABELS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

export type TablaModo = 'POR_PROPIETARIO' | 'POR_PROPIEDAD';

export interface ChartBarData {
  label: string;
  ingresoHeight: number;
  egresoHeight: number;
  totalIngresos: number;
  totalEgresos: number;
}

@Component({
  selector: 'app-reporte-anual',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-anual.component.html',
  styleUrl: './reporte-anual.component.css'
})
export class ReporteAnualComponent {
  private readonly reporteService = inject(ReporteAnualPropietariosService);
  private readonly contactService = inject(ContactManagementService);

  readonly selectedAnio = signal<number>(new Date().getFullYear());
  readonly selectedPropietarioRut = signal<string | null>(null);
  readonly owners = signal<ContactRecord[]>([]);
  readonly reporte = signal<ReporteAnualPropietariosResponse | null>(null);

  readonly isLoadingOwners = signal(false);
  readonly isLoading = signal(false);
  readonly isExporting = signal(false);
  readonly error = signal('');

  readonly tablaModo = computed<TablaModo>(() => {
    const r = this.reporte();
    if (!r || r.propietarioRutFiltro === null) {
      return 'POR_PROPIETARIO';
    }
    return 'POR_PROPIEDAD';
  });

  readonly propietariosTabla = computed<PropietarioResumenAnual[]>(() => {
    const r = this.reporte();
    if (!r || this.tablaModo() !== 'POR_PROPIETARIO') return [];
    return r.propietarios;
  });

  readonly propiedadesTabla = computed<PropiedadResumenAnual[]>(() => {
    const r = this.reporte();
    if (!r || this.tablaModo() !== 'POR_PROPIEDAD') return [];
    return r.propietarios[0]?.propiedades ?? [];
  });

  readonly chartData = computed<ChartBarData[]>(() => {
    const r = this.reporte();
    if (!r) return [];

    const sorted = [...r.resumenMensualGlobal].sort((a, b) => a.mes - b.mes);
    const maxVal = Math.max(...sorted.map((m) => Math.max(m.totalIngresos, m.totalEgresos)), 1);

    return sorted.map((m) => ({
      label: MONTH_LABELS[m.mes - 1] ?? String(m.mes),
      ingresoHeight: (m.totalIngresos / maxVal) * 100,
      egresoHeight: (m.totalEgresos / maxVal) * 100,
      totalIngresos: m.totalIngresos,
      totalEgresos: m.totalEgresos
    }));
  });

  constructor() {
    this.loadOwners();
  }

  aplicarFiltros(): void {
    if (!this.selectedAnio() || this.selectedAnio() <= 0) {
      this.error.set('Debes indicar un año válido.');
      return;
    }

    this.error.set('');
    this.reporte.set(null);
    this.isLoading.set(true);

    const rut = this.selectedPropietarioRut() ?? undefined;

    this.reporteService
      .getReporteAnual(this.selectedAnio(), rut)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => this.reporte.set(data),
        error: (err) =>
          this.error.set(this.extractErrorMessage(err, 'No se pudo cargar el reporte anual.'))
      });
  }

  exportarPdf(): void {
    const rut = this.selectedPropietarioRut() ?? undefined;
    this.isExporting.set(true);
    this.reporteService
      .exportarPdf(this.selectedAnio(), rut)
      .pipe(finalize(() => this.isExporting.set(false)))
      .subscribe({
        next: (blob) => this.triggerDownload(blob, `reporte-anual-${this.selectedAnio()}.pdf`),
        error: (err) =>
          this.error.set(this.extractErrorMessage(err, 'No se pudo exportar el PDF.'))
      });
  }

  exportarExcel(): void {
    const rut = this.selectedPropietarioRut() ?? undefined;
    this.isExporting.set(true);
    this.reporteService
      .exportarExcel(this.selectedAnio(), rut)
      .pipe(finalize(() => this.isExporting.set(false)))
      .subscribe({
        next: (blob) => this.triggerDownload(blob, `reporte-anual-${this.selectedAnio()}.xlsx`),
        error: (err) =>
          this.error.set(this.extractErrorMessage(err, 'No se pudo exportar el Excel.'))
      });
  }

  private loadOwners(): void {
    this.isLoadingOwners.set(true);
    this.contactService
      .listContacts('propietarios')
      .pipe(finalize(() => this.isLoadingOwners.set(false)))
      .subscribe({
        next: (owners) => this.owners.set(owners),
        error: () => {}
      });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
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
    }

    const topLevel = (error as { message?: unknown })?.message;
    if (typeof topLevel === 'string' && topLevel.trim()) {
      return topLevel;
    }

    return fallback;
  }
}
