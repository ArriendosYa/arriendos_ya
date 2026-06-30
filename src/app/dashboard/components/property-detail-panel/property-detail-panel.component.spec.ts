import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PropertyEventRecord } from '../../models/property-event.model';
import { PropertyRecord } from '../../models/property.model';
import { PropertyEventService } from '../../services/property-event.service';
import { PropertyDetailPanelComponent } from './property-detail-panel.component';

const MOCK_PROPERTY: PropertyRecord = {
  id: 1,
  direccion: 'Av. Providencia 1250, Depto 402',
  comuna: 'Providencia',
  ciudad: 'Santiago',
  region: 'Metropolitana',
  numeroHabitaciones: 2,
  numeroBanos: 1,
  precioArriendo: 950000,
  disponible: true
};

const MOCK_EVENTS: PropertyEventRecord[] = [
  {
    id: 10,
    tipo: 'visita',
    descripcion: 'Visita agendada',
    fecha: '2026-07-02T15:00:00.000Z',
    url: 'https://meet.example.com/abc',
    propiedad: { id: 1 }
  },
  {
    id: 11,
    tipo: 'mantenimiento',
    descripcion: 'Revisión eléctrica',
    fecha: '2026-06-20T13:30:00.000Z',
    propiedad: { id: 1 }
  }
];

describe('PropertyDetailPanelComponent', () => {
  const propertyEventServiceSpy = jasmine.createSpyObj<PropertyEventService>(
    'PropertyEventService',
    ['listByPropertyId', 'createEvent']
  );

  beforeEach(async () => {
    propertyEventServiceSpy.listByPropertyId.calls.reset();
    propertyEventServiceSpy.createEvent.calls.reset();
    propertyEventServiceSpy.listByPropertyId.and.returnValue(of(MOCK_EVENTS));
    propertyEventServiceSpy.createEvent.and.returnValue(
      of({
        id: 12,
        tipo: 'visita',
        descripcion: 'Visita con cliente',
        propiedad: { id: 1 }
      })
    );

    await TestBed.configureTestingModule({
      imports: [PropertyDetailPanelComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PropertyEventService, useValue: propertyEventServiceSpy }
      ]
    }).compileComponents();
  });

  it('should load and render events for the selected property', () => {
    const fixture = TestBed.createComponent(PropertyDetailPanelComponent);

    fixture.componentRef.setInput('property', MOCK_PROPERTY);
    fixture.detectChanges();

    expect(propertyEventServiceSpy.listByPropertyId).toHaveBeenCalledWith(1);
    expect(fixture.componentInstance.events.length).toBe(2);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Historial de actividad');
    expect(compiled.textContent).toContain('Visita agendada');
    expect(compiled.textContent).toContain('Revisión eléctrica');
  });

  it('should validate required fields before creating an event', () => {
    const fixture = TestBed.createComponent(PropertyDetailPanelComponent);

    fixture.componentRef.setInput('property', MOCK_PROPERTY);
    fixture.detectChanges();
    fixture.componentInstance.eventFormModel.descripcion = '';

    fixture.componentInstance.createEvent();

    expect(propertyEventServiceSpy.createEvent).not.toHaveBeenCalled();
    expect(fixture.componentInstance.eventFormErrorMessage).toContain(
      'Completa al menos el tipo y la descripción del evento.'
    );
  });

  it('should create an event and reload the property timeline', () => {
    propertyEventServiceSpy.listByPropertyId.and.returnValues(of([]), of(MOCK_EVENTS));

    const fixture = TestBed.createComponent(PropertyDetailPanelComponent);

    fixture.componentRef.setInput('property', MOCK_PROPERTY);
    fixture.detectChanges();
    fixture.componentInstance.eventFormModel.tipo = 'visita';
    fixture.componentInstance.eventFormModel.fecha = '2026-07-01';
    fixture.componentInstance.eventFormModel.descripcion = 'Visita con cliente';
    fixture.componentInstance.eventFormModel.observaciones = 'Cliente confirmado';
    fixture.componentInstance.eventFormModel.url = 'https://meet.example.com/abc';

    fixture.componentInstance.createEvent();

    expect(propertyEventServiceSpy.createEvent).toHaveBeenCalled();
    expect(propertyEventServiceSpy.listByPropertyId).toHaveBeenCalledTimes(2);

    const payload = propertyEventServiceSpy.createEvent.calls.mostRecent().args[0];
    expect(payload.propiedad).toEqual({ id: 1 });
    expect(payload.tipo).toBe('visita');
    expect(payload.url).toBe('https://meet.example.com/abc');
    expect(payload.descripcion).toContain('Visita con cliente');
    expect(payload.descripcion).toContain('Observaciones: Cliente confirmado');
    expect(payload.fecha).toBe('2026-07-01T12:00:00.000Z');
    expect(fixture.componentInstance.eventFormModel.descripcion).toBe('');
    expect(fixture.componentInstance.events.length).toBe(2);
  });
});
