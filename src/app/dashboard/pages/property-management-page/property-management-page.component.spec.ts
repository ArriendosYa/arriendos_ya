import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PropertyRecord } from '../../models/property.model';
import { PropertyEventService } from '../../services/property-event.service';
import { PropertyManagementService } from '../../services/property-management.service';
import { PropertyManagementPageComponent } from './property-management-page.component';

const MOCK_PROPERTIES: PropertyRecord[] = [
  {
    id: 1,
    direccion: 'Av. Providencia 1250, Depto 402',
    comuna: 'Providencia',
    ciudad: 'Santiago',
    region: 'Metropolitana',
    numeroHabitaciones: 2,
    numeroBanos: 1,
    precioArriendo: 950000,
    disponible: true
  },
  {
    id: 2,
    direccion: 'Los Militares 3480, Oficina 611',
    comuna: 'Las Condes',
    ciudad: 'Santiago',
    region: 'Metropolitana',
    numeroHabitaciones: 3,
    numeroBanos: 2,
    precioArriendo: 1450000,
    disponible: false
  }
];

describe('PropertyManagementPageComponent', () => {
  const serviceSpy = jasmine.createSpyObj<PropertyManagementService>(
    'PropertyManagementService',
    ['listProperties', 'createProperty', 'updateProperty', 'deleteProperty']
  );
  const propertyEventServiceSpy = jasmine.createSpyObj<PropertyEventService>(
    'PropertyEventService',
    ['listByPropertyId', 'createEvent']
  );

  beforeEach(async () => {
    serviceSpy.listProperties.calls.reset();
    serviceSpy.createProperty.calls.reset();
    serviceSpy.updateProperty.calls.reset();
    serviceSpy.deleteProperty.calls.reset();
    serviceSpy.listProperties.and.returnValue(of(MOCK_PROPERTIES));
    serviceSpy.createProperty.and.returnValue(of(MOCK_PROPERTIES[0]));
    serviceSpy.updateProperty.and.returnValue(of(MOCK_PROPERTIES[0]));
    serviceSpy.deleteProperty.and.returnValue(of(undefined));
    propertyEventServiceSpy.listByPropertyId.calls.reset();
    propertyEventServiceSpy.createEvent.calls.reset();
    propertyEventServiceSpy.listByPropertyId.and.returnValue(of([]));
    propertyEventServiceSpy.createEvent.and.returnValue(
      of({
        id: 1,
        tipo: 'visita',
        descripcion: 'Evento creado',
        propiedad: { id: 1 }
      })
    );

    await TestBed.configureTestingModule({
      imports: [PropertyManagementPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: PropertyManagementService, useValue: serviceSpy },
        { provide: PropertyEventService, useValue: propertyEventServiceSpy }
      ]
    }).compileComponents();
  });

  it('should render the property management view', () => {
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-sidebar')).not.toBeNull();
    expect(compiled.querySelector('app-topbar')).not.toBeNull();
    expect(compiled.textContent).toContain('Mantener Propiedades');
    expect(compiled.textContent).toContain('Filtros');
    expect(compiled.textContent).toContain('Nueva Propiedad');
  });

  it('should load properties from the API on init', () => {
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();

    expect(serviceSpy.listProperties).toHaveBeenCalled();
    expect(fixture.componentInstance.properties().length).toBe(2);
  });

  it('should filter properties by availability', () => {
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateFilters({ disponible: false, comuna: 'Todas' });
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredProperties().length).toBe(1);
    expect(fixture.componentInstance.filteredProperties()[0].disponible).toBeFalse();
  });

  it('should select a property and show it in the panel', () => {
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectProperty(MOCK_PROPERTIES[0]);
    fixture.detectChanges();

    expect(fixture.componentInstance.selectedPropertyId()).toBe(1);
    expect(fixture.componentInstance.panelProperty()?.id).toBe(1);
  });

  it('should open an empty form when newProperty is called', () => {
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.newProperty();
    fixture.detectChanges();

    expect(fixture.componentInstance.isCreating()).toBeTrue();
    expect(fixture.componentInstance.panelProperty()?.id).toBe(0);
  });

  it('should call createProperty on the service when saving a new property', () => {
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.newProperty();
    const newProperty: PropertyRecord = {
      id: 0,
      direccion: 'Nueva Dir 123',
      comuna: 'Santiago',
      ciudad: 'Santiago',
      region: 'Metropolitana',
      numeroHabitaciones: 2,
      numeroBanos: 1,
      precioArriendo: 500000,
      disponible: true
    };
    fixture.componentInstance.saveProperty(newProperty);

    expect(serviceSpy.createProperty).toHaveBeenCalled();
  });

  it('should call updateProperty on the service when saving an existing property', () => {
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.saveProperty(MOCK_PROPERTIES[0]);

    expect(serviceSpy.updateProperty).toHaveBeenCalledWith(1, MOCK_PROPERTIES[0]);
  });

  it('should call deleteProperty on the service', () => {
    const fixture = TestBed.createComponent(PropertyManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.deleteProperty(MOCK_PROPERTIES[0]);

    expect(serviceSpy.deleteProperty).toHaveBeenCalledWith(1);
  });
});
