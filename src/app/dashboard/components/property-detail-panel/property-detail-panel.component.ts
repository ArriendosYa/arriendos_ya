import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ContactRecord } from '../../models/contact.model';
import { PropertyRecord } from '../../models/property.model';

@Component({
  selector: 'app-property-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './property-detail-panel.component.html',
  styleUrl: './property-detail-panel.component.css'
})
export class PropertyDetailPanelComponent implements OnChanges {
  @Input() property: PropertyRecord | null = null;
  @Input() owners: ContactRecord[] = [];
  @Input() isSaving = false;
  @Input() errorMessage = '';

  @Output() readonly save = new EventEmitter<PropertyRecord>();

  editableProperty: PropertyRecord | null = null;
  validationMessage = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['property'] || changes['owners']) {
      this.editableProperty = this.property
        ? {
            ...this.property,
            propietario: { rut: this.property.propietario?.rut ?? '' }
          }
        : null;
      this.validationMessage = '';
    }
  }

  saveChanges(): void {
    if (!this.editableProperty) return;

    if (!this.editableProperty.propietario?.rut?.trim()) {
      this.validationMessage = 'Debes seleccionar un propietario.';
      return;
    }

    this.validationMessage = '';
    this.save.emit({
      ...this.editableProperty,
      propietario: { rut: this.editableProperty.propietario.rut.trim() }
    });
  }

  formatOwnerLabel(owner: ContactRecord): string {
    return `${owner.nombre} ${owner.apellido} (${owner.rut})`;
  }

  hasOwnerInList(rut: string): boolean {
    return this.owners.some((owner) => owner.rut === rut);
  }
}
