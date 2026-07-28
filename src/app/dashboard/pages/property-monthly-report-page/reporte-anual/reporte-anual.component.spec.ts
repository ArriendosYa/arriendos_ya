import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ContactRecord } from '../../../models/contact.model';
import { ReporteAnualPropietariosResponse } from '../../../models/reporte-anual-propietarios.model';
import { ContactManagementService } from '../../../services/contact-management.service';
import { ReporteAnualPropietariosService } from '../../../services/reporte-anual-propietarios.service';
import { ReporteAnualComponent } from './reporte-anual.component';

const OWNERS: ContactRecord[] = [
  {
    rut: '18557194-7',
    nombre: 'Erica',
    apellido: 'Parra',
    telefono: '+56 9 1234 5678',
    email: 'erica.parra@example.com'
  }
];

const REPORTE_TODOS: ReporteAnualPropietariosResponse = {
  anio: 2026,
  propietarioRutFiltro: null,
  cantidadPropietarios: 2,
  totalIngresos: 17760000,
  totalEgresos: 1200000,
  balance: 16560000,
  resumenMensualGlobal: Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    totalIngresos: i === 6 ? 17760000 : 0,
    totalEgresos: i === 6 ? 1200000 : 0,
    balance: i === 6 ? 16560000 : 0
  })),
  propietarios: [
    {
      propietarioRut: '5335788-1',
      propietarioNombreCompleto: 'Ana Parisi',
      anio: 2026,
      cantidadPropiedades: 3,
      totalIngresos: 11840000,
      totalEgresos: 800000,
      balance: 11040000,
      resumenMensual: [],
      propiedades: []
    },
    {
      propietarioRut: '18557194-7',
      propietarioNombreCompleto: 'Erica Parra',
      anio: 2026,
      cantidadPropiedades: 1,
      totalIngresos: 5920000,
      totalEgresos: 400000,
      balance: 5520000,
      resumenMensual: [],
      propiedades: [
        {
          propiedadId: 8,
          direccion: 'Guillermo Subiabre 5436',
          comuna: 'Estación Central',
          ciudad: 'Santiago',
          region: 'Metropolitana',
          totalIngresos: 5920000,
          totalEgresos: 400000,
          balance: 5520000
        }
      ]
    }
  ]
};

const REPORTE_PROPIETARIO: ReporteAnualPropietariosResponse = {
  anio: 2026,
  propietarioRutFiltro: '18557194-7',
  cantidadPropietarios: 1,
  totalIngresos: 5920000,
  totalEgresos: 400000,
  balance: 5520000,
  resumenMensualGlobal: Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    totalIngresos: i === 6 ? 5920000 : 0,
    totalEgresos: i === 6 ? 400000 : 0,
    balance: i === 6 ? 5520000 : 0
  })),
  propietarios: [
    {
      propietarioRut: '18557194-7',
      propietarioNombreCompleto: 'Erica Parra',
      anio: 2026,
      cantidadPropiedades: 1,
      totalIngresos: 5920000,
      totalEgresos: 400000,
      balance: 5520000,
      resumenMensual: [],
      propiedades: [
        {
          propiedadId: 8,
          direccion: 'Guillermo Subiabre 5436',
          comuna: 'Estación Central',
          ciudad: 'Santiago',
          region: 'Metropolitana',
          totalIngresos: 5920000,
          totalEgresos: 400000,
          balance: 5520000
        }
      ]
    }
  ]
};

describe('ReporteAnualComponent', () => {
  const reporteServiceSpy = jasmine.createSpyObj<ReporteAnualPropietariosService>(
    'ReporteAnualPropietariosService',
    ['getReporteAnual', 'exportarPdf', 'exportarExcel']
  );
  const contactServiceSpy = jasmine.createSpyObj<ContactManagementService>('ContactManagementService', [
    'listContacts'
  ]);

  beforeEach(async () => {
    reporteServiceSpy.getReporteAnual.calls.reset();
    reporteServiceSpy.exportarPdf.calls.reset();
    reporteServiceSpy.exportarExcel.calls.reset();
    contactServiceSpy.listContacts.calls.reset();

    reporteServiceSpy.getReporteAnual.and.returnValue(of(REPORTE_TODOS));
    reporteServiceSpy.exportarPdf.and.returnValue(of(new Blob()));
    reporteServiceSpy.exportarExcel.and.returnValue(of(new Blob()));
    contactServiceSpy.listContacts.and.returnValue(of(OWNERS));

    await TestBed.configureTestingModule({
      imports: [ReporteAnualComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ReporteAnualPropietariosService, useValue: reporteServiceSpy },
        { provide: ContactManagementService, useValue: contactServiceSpy }
      ]
    }).compileComponents();
  });

  it('should load owners on init', () => {
    const fixture = TestBed.createComponent(ReporteAnualComponent);
    fixture.detectChanges();

    expect(contactServiceSpy.listContacts).toHaveBeenCalledWith('propietarios');
    expect(fixture.componentInstance.owners()).toEqual(OWNERS);
  });

  it('should call getReporteAnual without rut when propietario is "Todos"', () => {
    const fixture = TestBed.createComponent(ReporteAnualComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectedAnio.set(2026);
    fixture.componentInstance.selectedPropietarioRut.set(null);
    fixture.componentInstance.aplicarFiltros();

    expect(reporteServiceSpy.getReporteAnual).toHaveBeenCalledWith(2026, undefined);
    expect(fixture.componentInstance.reporte()).toEqual(REPORTE_TODOS);
  });

  it('should call getReporteAnual with rut when a specific propietario is selected', () => {
    reporteServiceSpy.getReporteAnual.and.returnValue(of(REPORTE_PROPIETARIO));
    const fixture = TestBed.createComponent(ReporteAnualComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectedAnio.set(2026);
    fixture.componentInstance.selectedPropietarioRut.set('18557194-7');
    fixture.componentInstance.aplicarFiltros();

    expect(reporteServiceSpy.getReporteAnual).toHaveBeenCalledWith(2026, '18557194-7');
    expect(fixture.componentInstance.reporte()).toEqual(REPORTE_PROPIETARIO);
  });

  it('should set tablaModo to POR_PROPIETARIO when propietarioRutFiltro is null', () => {
    const fixture = TestBed.createComponent(ReporteAnualComponent);
    fixture.detectChanges();

    fixture.componentInstance.reporte.set(REPORTE_TODOS);

    expect(fixture.componentInstance.tablaModo()).toBe('POR_PROPIETARIO');
    expect(fixture.componentInstance.propietariosTabla().length).toBe(2);
    expect(fixture.componentInstance.propiedadesTabla().length).toBe(0);
  });

  it('should set tablaModo to POR_PROPIEDAD when propietarioRutFiltro is set', () => {
    const fixture = TestBed.createComponent(ReporteAnualComponent);
    fixture.detectChanges();

    fixture.componentInstance.reporte.set(REPORTE_PROPIETARIO);

    expect(fixture.componentInstance.tablaModo()).toBe('POR_PROPIEDAD');
    expect(fixture.componentInstance.propiedadesTabla().length).toBe(1);
    expect(fixture.componentInstance.propietariosTabla().length).toBe(0);
  });

  it('should compute chartData with 12 sorted months', () => {
    const fixture = TestBed.createComponent(ReporteAnualComponent);
    fixture.detectChanges();

    fixture.componentInstance.reporte.set(REPORTE_TODOS);
    const chart = fixture.componentInstance.chartData();

    expect(chart.length).toBe(12);
    expect(chart[0].label).toBe('ENE');
    expect(chart[6].label).toBe('JUL');
    expect(chart[6].ingresoHeight).toBe(100);
    expect(chart[0].ingresoHeight).toBe(0);
  });

  it('should show validation error when anio is invalid', () => {
    const fixture = TestBed.createComponent(ReporteAnualComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectedAnio.set(0);
    fixture.componentInstance.aplicarFiltros();

    expect(reporteServiceSpy.getReporteAnual).not.toHaveBeenCalled();
    expect(fixture.componentInstance.error()).toContain('año válido');
  });

  it('should set error message when API call fails', () => {
    reporteServiceSpy.getReporteAnual.and.returnValue(throwError(() => ({ error: 'Error del servidor' })));
    const fixture = TestBed.createComponent(ReporteAnualComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectedAnio.set(2026);
    fixture.componentInstance.aplicarFiltros();

    expect(fixture.componentInstance.error()).toBe('Error del servidor');
  });
});
