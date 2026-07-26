import { HttpErrorResponse } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Arriendo, DiaPago } from '../../models/arriendo.model';
import { ContactRecord } from '../../models/contact.model';
import { PropertyRecord } from '../../models/property.model';
import { ArriendosService } from '../../services/arriendos.service';
import { ContactManagementService } from '../../services/contact-management.service';
import { PropertyManagementService } from '../../services/property-management.service';
import { TenantAssignmentPageComponent } from './tenant-assignment-page.component';

const MOCK_AVAILABLE_PROPERTY: PropertyRecord = {
  id: 4,
  direccion: 'Irarrázaval 2110, Depto 1203',
  comuna: 'Ñuñoa',
  ciudad: 'Santiago',
  region: 'Metropolitana',
  numeroHabitaciones: 3,
  numeroBanos: 2,
  precioArriendo: 680000,
  disponible: true
};

const MOCK_ASSIGNED_PROPERTY: PropertyRecord = {
  ...MOCK_AVAILABLE_PROPERTY,
  disponible: false
};

const MOCK_CONTACT: ContactRecord = {
  rut: '12345678-9',
  nombre: 'Camila',
  apellido: 'Torres',
  telefono: '+56 9 8512 4491'
};

const MOCK_ARRENDAMIENTO: Arriendo = {
  id: 25,
  propiedad: { id: 4 },
  arrendatario: { rut: '12345678-9' },
  fechaInicio: '2026-07-01',
  fechaTermino: '2027-06-30',
  diaPago: DiaPago.DIA_5,
  reajusteSemestral: 3,
  activo: true
};

describe('TenantAssignmentPageComponent', () => {
  const propertyServiceSpy = jasmine.createSpyObj<PropertyManagementService>(
    'PropertyManagementService',
    ['listProperties', 'updateProperty']
  );
  const contactServiceSpy = jasmine.createSpyObj<ContactManagementService>(
    'ContactManagementService',
    ['listContacts']
  );
  const arriendosServiceSpy = jasmine.createSpyObj<ArriendosService>('ArriendosService', [
    'list',
    'create',
    'update',
    'listByPropiedad',
    'listByArrendatario',
    'finalizar'
  ]);

  beforeEach(async () => {
    propertyServiceSpy.listProperties.calls.reset();
    propertyServiceSpy.updateProperty.calls.reset();
    contactServiceSpy.listContacts.calls.reset();
    arriendosServiceSpy.list.calls.reset();
    arriendosServiceSpy.create.calls.reset();
    arriendosServiceSpy.update.calls.reset();

    propertyServiceSpy.listProperties.and.returnValue(of([MOCK_AVAILABLE_PROPERTY]));
    propertyServiceSpy.updateProperty.and.returnValue(of(MOCK_ASSIGNED_PROPERTY));
    contactServiceSpy.listContacts.and.returnValue(of([MOCK_CONTACT]));
    arriendosServiceSpy.list.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [TenantAssignmentPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PropertyManagementService, useValue: propertyServiceSpy },
        { provide: ContactManagementService, useValue: contactServiceSpy },
        { provide: ArriendosService, useValue: arriendosServiceSpy }
      ]
    }).compileComponents();
  });

  it('should render the tenant assignment page', () => {
    const fixture = TestBed.createComponent(TenantAssignmentPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-sidebar')).not.toBeNull();
    expect(compiled.querySelector('app-topbar')).not.toBeNull();
    expect(compiled.textContent).toContain('Asignar arrendatario a propiedad');
    expect(compiled.textContent).toContain('Resumen de asignación');
    expect(compiled.textContent).toContain('Confirmar asignación');
    expect(compiled.textContent).toContain('Guardar como borrador');
    expect(compiled.textContent).toContain('Cancelar proceso');
  });

  it('should only expose available properties for assignment', () => {
    const fixture = TestBed.createComponent(TenantAssignmentPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.availableProperties().length).toBeGreaterThan(0);
    expect(
      fixture.componentInstance.availableProperties().every((property) => property.disponible)
    ).toBeTrue();
  });

  it('should load assignments from API and show list when enabled', () => {
    arriendosServiceSpy.list.and.returnValue(of([MOCK_ARRENDAMIENTO]));

    const fixture = TestBed.createComponent(TenantAssignmentPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.toggleAssignmentsList();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Asignaciones realizadas');
    expect(compiled.textContent).toContain('Irarrázaval 2110, Depto 1203');
    expect(compiled.textContent).toContain('Camila Torres');
    expect(compiled.textContent).toContain('12345678-9');
    expect(arriendosServiceSpy.list).toHaveBeenCalled();
  });

  it('should create arriendo on successful confirmation when there is no active arriendo', () => {
    arriendosServiceSpy.create.and.returnValue(of(MOCK_ARRENDAMIENTO));

    const fixture = TestBed.createComponent(TenantAssignmentPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateField('propertyId', 4);
    fixture.componentInstance.updateField('tenantId', '12345678-9');
    fixture.componentInstance.updateField('monthlyRent', 680000);
    fixture.componentInstance.updateField('guaranteeMonths', 1);
    fixture.componentInstance.updateField('startDate', '2026-07-01');
    fixture.componentInstance.updateField('endDate', '2027-06-30');
    fixture.componentInstance.updateField('paymentDay', 5);
    fixture.componentInstance.updateField('semiannualAdjustment', 3);
    fixture.detectChanges();

    const form = { control: { markAllAsTouched: () => {} }, invalid: false } as any;
    fixture.componentInstance.confirmAssignment(form);

    expect(propertyServiceSpy.updateProperty).toHaveBeenCalledWith(4, {
      ...MOCK_AVAILABLE_PROPERTY,
      disponible: false
    });
    expect(arriendosServiceSpy.create).toHaveBeenCalledWith({
      propiedad: { id: 4 },
      arrendatario: { rut: '12345678-9' },
      fechaInicio: '2026-07-01',
      diaPago: DiaPago.DIA_5,
      reajusteSemestral: 3,
      activo: true
    });
    expect(fixture.componentInstance.feedbackType()).toBe('success');
    expect(fixture.componentInstance.availableProperties()).toEqual([]);
  });

  it('should update arriendo when the selected property already has an active arriendo', () => {
    const existingArriendo: Arriendo = { ...MOCK_ARRENDAMIENTO, id: 70 };
    arriendosServiceSpy.list.and.returnValue(of([existingArriendo]));
    arriendosServiceSpy.update.and.returnValue(of(existingArriendo));

    const fixture = TestBed.createComponent(TenantAssignmentPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateField('propertyId', 4);
    fixture.componentInstance.updateField('tenantId', '12345678-9');
    fixture.componentInstance.updateField('monthlyRent', 680000);
    fixture.componentInstance.updateField('guaranteeMonths', 1);
    fixture.componentInstance.updateField('startDate', '2026-07-01');
    fixture.componentInstance.updateField('endDate', '2027-06-30');
    fixture.componentInstance.updateField('paymentDay', 5);
    fixture.componentInstance.updateField('semiannualAdjustment', 3);

    const form = { control: { markAllAsTouched: () => {} }, invalid: false } as any;
    fixture.componentInstance.confirmAssignment(form);

    expect(arriendosServiceSpy.update).toHaveBeenCalledWith(70, {
      propiedad: { id: 4 },
      arrendatario: { rut: '12345678-9' },
      fechaInicio: '2026-07-01',
      diaPago: DiaPago.DIA_5,
      reajusteSemestral: 3,
      activo: true
    });
    expect(arriendosServiceSpy.create).not.toHaveBeenCalled();
  });

  it('should validate API contract fields before sending', () => {
    const fixture = TestBed.createComponent(TenantAssignmentPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateField('propertyId', 4);
    fixture.componentInstance.updateField('tenantId', '12345678-9');
    fixture.componentInstance.updateField('monthlyRent', 680000);
    fixture.componentInstance.updateField('guaranteeMonths', 1);
    fixture.componentInstance.updateField('startDate', '2026-07-01');
    fixture.componentInstance.updateField('endDate', '2027-06-30');
    fixture.componentInstance.updateField('paymentDay', 7);
    fixture.componentInstance.updateField('semiannualAdjustment', 3);

    const form = { control: { markAllAsTouched: () => {} }, invalid: false } as any;
    fixture.componentInstance.confirmAssignment(form);

    expect(arriendosServiceSpy.create).not.toHaveBeenCalled();
    expect(fixture.componentInstance.feedbackType()).toBe('error');
    expect(fixture.componentInstance.feedbackMessage()).toContain('día de pago');
  });

  it('should show mapped HTTP error when arriendo create fails', () => {
    arriendosServiceSpy.create.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400 }))
    );

    const fixture = TestBed.createComponent(TenantAssignmentPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateField('propertyId', 4);
    fixture.componentInstance.updateField('tenantId', '12345678-9');
    fixture.componentInstance.updateField('monthlyRent', 680000);
    fixture.componentInstance.updateField('guaranteeMonths', 1);
    fixture.componentInstance.updateField('startDate', '2026-07-01');
    fixture.componentInstance.updateField('endDate', '2027-06-30');
    fixture.componentInstance.updateField('paymentDay', 5);
    fixture.componentInstance.updateField('semiannualAdjustment', 3);

    const form = { control: { markAllAsTouched: () => {} }, invalid: false } as any;
    fixture.componentInstance.confirmAssignment(form);

    expect(arriendosServiceSpy.create).toHaveBeenCalled();
    expect(fixture.componentInstance.feedbackType()).toBe('error');
    expect(fixture.componentInstance.feedbackMessage()).toContain('Solicitud inválida');
  });

  it('should reset form on resetDemo', () => {
    const fixture = TestBed.createComponent(TenantAssignmentPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateField('propertyId', 4);
    fixture.detectChanges();

    const form = {
      control: { markAllAsTouched: () => {} },
      invalid: false,
      resetForm: () => {}
    } as any;
    fixture.componentInstance.resetDemo(form);

    expect(fixture.componentInstance.formModel().propertyId).toBeNull();
    expect(fixture.componentInstance.feedbackMessage()).toContain('Formulario reiniciado');
  });
});
