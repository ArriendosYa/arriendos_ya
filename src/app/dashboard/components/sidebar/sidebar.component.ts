import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface SidebarMenuItem {
  label: string;
  path?: string;
  exact?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  readonly menuItems: SidebarMenuItem[] = [
    { label: 'Dashboard', path: '/dashboard', exact: true },
    { label: 'Propiedades', path: '/propiedades' },
    { label: 'Contactos', path: '/contactos' },
    { label: 'Asignaciones', path: '/asignaciones' },
    { label: 'Reportes', path: '/reportes' },
  ];
}
