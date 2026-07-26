import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MovimientoListResponse, MovimientoRecord } from '../../models/movimiento.model';
import { PropertyRecord } from '../../models/property.model';
import { MovimientoService } from '../../services/movimiento.service';
import { PropertyManagementService } from '../../services/property-management.service';
import { PropertyMovementsPageComponent } from './property-movements-page.component';

const PROPERTY: PropertyRecord = {
  id: 10,
  direccion: 'Av. Apoquindo 1000',
  comuna: 'Las Condes',
  ciudad: 'Santiago',
  region: 'Metropolitana',
  numeroHabitaciones: 2,
  numeroBanos: 2,
  precioArriendo: 800000,
  disponible: true,
  propietario: { rut: '11.111.111-1' }
};

const MOVIMIENTOS: MovimientoRecord[] = [
  {
    id: 1,
    propiedad: { id: 10 },
    tipo: 'INGRESO',
    concepto: 'Arriendo julio',
    monto: 800000,
    fecha: '2026-07-01',
    estado: 'PAGADO'
  }
];

const MOVIMIENTOS_RESPONSE: MovimientoListResponse = {
  movimientos: MOVIMIENTOS,
  totalIngresos: 800000,
  totalEgresos: 120000,
  saldo: 680000
};

describe('PropertyMovementsPageComponent', () => {
  const propertyServiceSpy = jasmine.createSpyObj<PropertyManagementService>('PropertyManagementService', [
    'getProperty'
  ]);
  const movimientoServiceSpy = jasmine.createSpyObj<MovimientoService>('MovimientoService', [
    'listByPropiedad',
    'createConComprobante',
    'updateMovimiento',
    'updateComprobante',
    'deleteMovimiento'
  ]);

  beforeEach(async () => {
    propertyServiceSpy.getProperty.calls.reset();
    movimientoServiceSpy.listByPropiedad.calls.reset();
    movimientoServiceSpy.createConComprobante.calls.reset();
    movimientoServiceSpy.updateMovimiento.calls.reset();
    movimientoServiceSpy.updateComprobante.calls.reset();
    movimientoServiceSpy.deleteMovimiento.calls.reset();

    propertyServiceSpy.getProperty.and.returnValue(of(PROPERTY));
    movimientoServiceSpy.listByPropiedad.and.returnValue(of(MOVIMIENTOS_RESPONSE));
    movimientoServiceSpy.createConComprobante.and.returnValue(of(MOVIMIENTOS[0]));
    movimientoServiceSpy.updateMovimiento.and.returnValue(of(MOVIMIENTOS[0]));
    movimientoServiceSpy.updateComprobante.and.returnValue(of(MOVIMIENTOS[0]));
    movimientoServiceSpy.deleteMovimiento.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [PropertyMovementsPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'id' ? '10' : null)
              }
            }
          }
        },
        { provide: PropertyManagementService, useValue: propertyServiceSpy },
        { provide: MovimientoService, useValue: movimientoServiceSpy }
      ]
    }).compileComponents();
  });

  it('should load property and movimientos on init', () => {
    const fixture = TestBed.createComponent(PropertyMovementsPageComponent);
    fixture.detectChanges();

    expect(propertyServiceSpy.getProperty).toHaveBeenCalledWith(10);
    expect(movimientoServiceSpy.listByPropiedad).toHaveBeenCalledWith(10);
    expect(fixture.componentInstance.movimientos().length).toBe(1);
    expect(fixture.componentInstance.totalIngresos()).toBe(800000);
    expect(fixture.componentInstance.totalEgresos()).toBe(120000);
    expect(fixture.componentInstance.saldo()).toBe(680000);
  });

  it('should validate form before saving', () => {
    const fixture = TestBed.createComponent(PropertyMovementsPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.formModel.set({
      tipo: 'INGRESO',
      concepto: '   ',
      monto: 100,
      fecha: '2026-07-03',
      estado: ''
    });

    fixture.componentInstance.saveMovimiento();

    expect(movimientoServiceSpy.createConComprobante).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formError()).toContain('concepto');
  });

  it('should create movimiento with selected property id', () => {
    const fixture = TestBed.createComponent(PropertyMovementsPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.formModel.set({
      tipo: 'INGRESO',
      concepto: 'Pago arriendo agosto',
      monto: 900000,
      fecha: '2026-08-05',
      estado: 'PAGADO'
    });

    fixture.componentInstance.saveMovimiento();

    expect(movimientoServiceSpy.createConComprobante).toHaveBeenCalledWith(
      {
        tipo: 'INGRESO',
        concepto: 'Pago arriendo agosto',
        monto: 900000,
        fecha: '2026-08-05',
        estado: 'PAGADO',
        propiedad: { id: 10 }
      },
      null
    );
  });

  it('should show backend errors in form message', () => {
    movimientoServiceSpy.createConComprobante.and.returnValue(
      throwError(() => ({ error: { message: 'Error de backend' } }))
    );

    const fixture = TestBed.createComponent(PropertyMovementsPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.formModel.set({
      tipo: 'INGRESO',
      concepto: 'Pago arriendo agosto',
      monto: 900000,
      fecha: '2026-08-05',
      estado: 'PAGADO'
    });

    fixture.componentInstance.saveMovimiento();

    expect(fixture.componentInstance.formError()).toBe('Error de backend');
  });
});
