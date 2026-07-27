import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ContactRecord } from '../../models/contact.model';
import { ContactManagementService } from '../../services/contact-management.service';
import { ContactManagementPageComponent } from './contact-management-page.component';

const MOCK_PROPIETARIOS: ContactRecord[] = [
  {
    rut: '12.345.678-5',
    nombre: 'María',
    apellido: 'Pérez',
    telefono: '+56 9 1234 5678',
    email: 'maria.perez@example.com'
  },
  {
    rut: '10.111.222-3',
    nombre: 'Pedro',
    apellido: 'González',
    telefono: '+56 9 1111 1111',
    email: 'pedro.gonzalez@example.com'
  },
  {
    rut: '14.567.890-K',
    nombre: 'Laura',
    apellido: 'Molina',
    telefono: '+56 9 2222 2222',
    email: 'laura.molina@example.com'
  },
  {
    rut: '16.234.567-4',
    nombre: 'Carlos',
    apellido: 'Ruiz',
    telefono: '+56 9 3333 3333',
    email: 'carlos.ruiz@example.com'
  },
  {
    rut: '18.765.432-6',
    nombre: 'Ana',
    apellido: 'Silva',
    telefono: '+56 9 4444 4444',
    email: 'ana.silva@example.com'
  },
  {
    rut: '9.876.543-3',
    nombre: 'Sofía',
    apellido: 'Torres',
    telefono: '+56 9 5555 5555',
    email: 'sofia.torres@example.com'
  }
];

const MOCK_ARRENDATARIOS: ContactRecord[] = [
  {
    rut: '98.765.432-1',
    nombre: 'Juan',
    apellido: 'Soto',
    telefono: '+56 9 1111 2222',
    email: 'juan.soto@example.com'
  }
];

describe('ContactManagementPageComponent', () => {
  const serviceSpy = jasmine.createSpyObj<ContactManagementService>(
    'ContactManagementService',
    ['listContacts', 'createContact', 'updateContact', 'deleteContact']
  );

  beforeEach(async () => {
    serviceSpy.listContacts.calls.reset();
    serviceSpy.createContact.calls.reset();
    serviceSpy.updateContact.calls.reset();
    serviceSpy.deleteContact.calls.reset();
    serviceSpy.listContacts.and.callFake((resource) =>
      of(resource === 'propietarios' ? MOCK_PROPIETARIOS : MOCK_ARRENDATARIOS)
    );
    serviceSpy.createContact.and.returnValue(of(MOCK_PROPIETARIOS[0]));
    serviceSpy.updateContact.and.returnValue(of(MOCK_PROPIETARIOS[0]));
    serviceSpy.deleteContact.and.returnValue(of(undefined));

    await TestBed.configureTestingModule({
      imports: [ContactManagementPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: ContactManagementService, useValue: serviceSpy }
      ]
    }).compileComponents();
  });

  it('should render contact management page', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Gestión de Contactos');
    expect(compiled.textContent).toContain('Propietarios');
    expect(compiled.textContent).toContain('Arrendatarios');
    expect(compiled.textContent).toContain('Guardar');
    expect(compiled.textContent).toContain('Limpiar');
  });

  it('should load owners on startup and tenants when changing tab', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    expect(serviceSpy.listContacts).toHaveBeenCalledWith('propietarios');
    fixture.componentInstance.setTab('arrendatarios');
    expect(serviceSpy.listContacts).toHaveBeenCalledWith('arrendatarios');
  });

  it('should select and clear a contact', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectContact(MOCK_PROPIETARIOS[0]);
    expect(fixture.componentInstance.selectedRut()).toBe(MOCK_PROPIETARIOS[0].rut);
    expect(fixture.componentInstance.formModel().nombre).toBe('María');

    fixture.componentInstance.clearForm();
    expect(fixture.componentInstance.selectedRut()).toBeNull();
    expect(fixture.componentInstance.formModel().nombre).toBe('');
  });

  it('should paginate contacts in groups of five', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.totalPages()).toBe(2);
    expect(fixture.componentInstance.pagedContacts().length).toBe(5);
    expect(fixture.componentInstance.rangeStart()).toBe(1);
    expect(fixture.componentInstance.rangeEnd()).toBe(5);

    fixture.componentInstance.nextPage();

    expect(fixture.componentInstance.currentPage()).toBe(2);
    expect(fixture.componentInstance.pagedContacts().length).toBe(1);
    expect(fixture.componentInstance.pagedContacts()[0].rut).toBe(MOCK_PROPIETARIOS[5].rut);
    expect(fixture.componentInstance.rangeStart()).toBe(6);
    expect(fixture.componentInstance.rangeEnd()).toBe(6);
  });

  it('should create or update a contact on save', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateField('rut', '11.111.111-1');
    fixture.componentInstance.updateField('nombre', 'Paula');
    fixture.componentInstance.updateField('apellido', 'Rojas');
    fixture.componentInstance.updateField('telefono', '+56 9 2222 3333');
    fixture.componentInstance.updateField('email', 'paula.rojas@example.com');
    fixture.componentInstance.saveContact(mockValidForm());
    expect(serviceSpy.createContact).toHaveBeenCalledWith('propietarios', {
      rut: '11.111.111-1',
      nombre: 'Paula',
      apellido: 'Rojas',
      telefono: '+56 9 2222 3333',
      email: 'paula.rojas@example.com'
    });

    fixture.componentInstance.selectContact(MOCK_PROPIETARIOS[0]);
    fixture.componentInstance.updateField('telefono', '+56 9 9999 9999');
    fixture.componentInstance.saveContact(mockValidForm());
    expect(serviceSpy.updateContact).toHaveBeenCalledWith('propietarios', '12.345.678-5', {
      rut: '12.345.678-5',
      nombre: 'María',
      apellido: 'Pérez',
      telefono: '+56 9 9999 9999',
      email: 'maria.perez@example.com'
    });
  });

  it('should validate chilean rut values before saving', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateField('rut', '12.345.678-0');
    fixture.componentInstance.updateField('nombre', 'Paula');
    fixture.componentInstance.updateField('apellido', 'Rojas');
    fixture.componentInstance.updateField('telefono', '+56 9 2222 3333');
    fixture.componentInstance.updateField('email', 'paula.rojas@example.com');
    fixture.componentInstance.saveContact(mockValidForm());

    expect(fixture.componentInstance.isRutValid('12.345.678-5')).toBeTrue();
    expect(fixture.componentInstance.isRutValid('12.345.678-0')).toBeFalse();
    expect(serviceSpy.createContact).not.toHaveBeenCalled();
  });

  it('should validate email format before saving', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.updateField('rut', '12.345.678-5');
    fixture.componentInstance.updateField('nombre', 'Paula');
    fixture.componentInstance.updateField('apellido', 'Rojas');
    fixture.componentInstance.updateField('telefono', '+56 9 2222 3333');
    fixture.componentInstance.updateField('email', 'correo-no-valido');
    fixture.componentInstance.saveContact(mockValidForm());

    expect(fixture.componentInstance.isEmailValid('paula.rojas@example.com')).toBeTrue();
    expect(fixture.componentInstance.isEmailValid('correo-no-valido')).toBeFalse();
    expect(serviceSpy.createContact).not.toHaveBeenCalled();
  });

  it('should delete the selected contact and reload the list', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.selectContact(MOCK_PROPIETARIOS[0]);
    expect(fixture.componentInstance.isEditing()).toBeTrue();

    fixture.componentInstance.deleteContact();

    expect(serviceSpy.deleteContact).toHaveBeenCalledWith('propietarios', '12.345.678-5');
    expect(fixture.componentInstance.selectedRut()).toBeNull();
    expect(fixture.componentInstance.successMessage()).toContain('eliminado');
  });

  it('should do nothing when deleteContact is called without a selected contact', () => {
    const fixture = TestBed.createComponent(ContactManagementPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.deleteContact();

    expect(serviceSpy.deleteContact).not.toHaveBeenCalled();
  });
});

function mockValidForm(): NgForm {
  return {
    control: {
      markAllAsTouched: () => undefined
    },
    invalid: false,
    resetForm: () => undefined
  } as unknown as NgForm;
}
