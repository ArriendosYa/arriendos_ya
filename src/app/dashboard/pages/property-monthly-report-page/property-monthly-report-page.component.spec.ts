import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ContactRecord } from '../../models/contact.model';
import { PropertyRecord } from '../../models/property.model';
import { ReporteMensualPropiedad } from '../../models/reporte-mensual-propiedad.model';
import { ContactManagementService } from '../../services/contact-management.service';
import { PropertyManagementService } from '../../services/property-management.service';
import { ReporteMensualPropiedadService } from '../../services/reporte-mensual-propiedad.service';
import { PropertyMonthlyReportPageComponent } from './property-monthly-report-page.component';

const PROPERTIES: PropertyRecord[] = [
  {
    id: 5,
    direccion: 'Pasto Verde 2525',
    comuna: 'Maipú',
    ciudad: 'Santiago',
    region: 'Región Metropolitana',
    numeroHabitaciones: 3,
    numeroBanos: 2,
    precioArriendo: 750000,
    disponible: true,
    propietario: { rut: '11.111.111-1' }
  }
];

const OWNERS: ContactRecord[] = [
  {
    rut: '11.111.111-1',
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '+56 9 1111 1111',
    email: 'juan.perez@example.com'
  }
];

const REPORT: ReporteMensualPropiedad = {
  propiedadId: 5,
  direccion: 'Pasto Verde 2525',
  comuna: 'Maipú',
  ciudad: 'Santiago',
  region: 'Región Metropolitana',
  mes: 7,
  anio: 2026,
  totalIngresos: 5920000,
  totalEgresos: 400000,
  balance: 5520000,
  diasTotalesMes: 31,
  diasOcupados: 0,
  porcentajeOcupacion: 0,
  movimientos: [],
  eventos: []
};

describe('PropertyMonthlyReportPageComponent', () => {
  const propertyServiceSpy = jasmine.createSpyObj<PropertyManagementService>('PropertyManagementService', [
    'listProperties'
  ]);
  const contactServiceSpy = jasmine.createSpyObj<ContactManagementService>('ContactManagementService', [
    'listContacts'
  ]);
  const reportServiceSpy = jasmine.createSpyObj<ReporteMensualPropiedadService>(
    'ReporteMensualPropiedadService',
    ['getReporteMensual', 'enviarReporteMensual']
  );

  beforeEach(async () => {
    propertyServiceSpy.listProperties.calls.reset();
    contactServiceSpy.listContacts.calls.reset();
    reportServiceSpy.getReporteMensual.calls.reset();
    reportServiceSpy.enviarReporteMensual.calls.reset();

    propertyServiceSpy.listProperties.and.returnValue(of(PROPERTIES));
    contactServiceSpy.listContacts.and.returnValue(of(OWNERS));
    reportServiceSpy.getReporteMensual.and.returnValue(of(REPORT));
    reportServiceSpy.enviarReporteMensual.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [PropertyMonthlyReportPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PropertyManagementService, useValue: propertyServiceSpy },
        { provide: ContactManagementService, useValue: contactServiceSpy },
        { provide: ReporteMensualPropiedadService, useValue: reportServiceSpy }
      ]
    }).compileComponents();
  });

  it('should load properties and owner emails on init', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    expect(propertyServiceSpy.listProperties).toHaveBeenCalled();
    expect(contactServiceSpy.listContacts).toHaveBeenCalledWith('propietarios');
    expect(fixture.componentInstance.selectedPropertyId()).toBe(5);
    expect(fixture.componentInstance.destinatariosInput()).toBe('juan.perez@example.com');
  });

  it('should fetch report data with selected filters', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectedMes.set(7);
    fixture.componentInstance.selectedAnio.set(2026);
    fixture.componentInstance.consultarReporte();

    expect(reportServiceSpy.getReporteMensual).toHaveBeenCalledWith(5, 2026, 7);
    expect(fixture.componentInstance.report()).toEqual(REPORT);
  });

  it('should send report using owner email as default recipient', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectedMes.set(7);
    fixture.componentInstance.selectedAnio.set(2026);
    fixture.componentInstance.report.set(REPORT);
    fixture.componentInstance.enviarReporte();

    expect(reportServiceSpy.enviarReporteMensual).toHaveBeenCalledWith(5, 2026, 7, {
      destinatarios: ['juan.perez@example.com']
    });
    expect(fixture.componentInstance.successMessage()).toContain('enviado exitosamente');
  });

  it('should validate month range before fetching report', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectedMes.set(13);
    fixture.componentInstance.consultarReporte();

    expect(reportServiceSpy.getReporteMensual).not.toHaveBeenCalled();
    expect(fixture.componentInstance.queryError()).toContain('mes');
  });

  it('should parse recipients trimming spaces and removing empty values', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    const parsed = (fixture.componentInstance as any).parseDestinatarios(
      ' owner@example.com, , admin@example.com  ,'
    );

    expect(parsed).toEqual(['owner@example.com', 'admin@example.com']);
  });

  it('should validate email formats', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.isEmailValid('user@example.com')).toBeTrue();
    expect(component.isEmailValid('user@@example.com')).toBeFalse();
    expect(component.isEmailValid('user@.example.com')).toBeFalse();
    expect(component.isEmailValid('user@example..com')).toBeFalse();
    expect(component.isEmailValid('user@-example.com')).toBeFalse();
    expect(component.isEmailValid('.user@example.com')).toBeFalse();
    expect(component.isEmailValid('us(er@example.com')).toBeFalse();
  });

  it('should clear recipients when selected property is invalid', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.destinatariosInput.set('prev@example.com');
    fixture.componentInstance.updateSelectedProperty(0);

    expect(fixture.componentInstance.selectedPropertyId()).toBeNull();
    expect(fixture.componentInstance.destinatariosInput()).toBe('');
  });

  it('should keep recipients empty when owner is not found', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.owners.set([]);
    fixture.componentInstance.updateSelectedProperty(5);

    expect(fixture.componentInstance.destinatariosInput()).toBe('');
  });

  it('should append query errors without duplicating messages', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.setQueryError('Error A');
    component.setQueryError('Error B');
    component.setQueryError('Error B');

    expect(fixture.componentInstance.queryError()).toBe('Error A Error B');
  });

  it('should extract backend messages from multiple payload formats', () => {
    const fixture = TestBed.createComponent(PropertyMonthlyReportPageComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(component.extractErrorMessage({ error: 'Texto error' }, 'fallback')).toBe('Texto error');
    expect(component.extractErrorMessage({ error: { message: 'Objeto error' } }, 'fallback')).toBe(
      'Objeto error'
    );
    expect(
      component.extractErrorMessage({ error: { message: ['Error 1', 'Error 2'] } }, 'fallback')
    ).toBe('Error 1 · Error 2');
    expect(component.extractErrorMessage({ message: 'Top level' }, 'fallback')).toBe('Top level');
    expect(component.extractErrorMessage({}, 'fallback')).toBe('fallback');
  });
});
