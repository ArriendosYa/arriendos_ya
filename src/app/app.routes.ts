import { Routes } from '@angular/router';
import { DashboardPageComponent } from './dashboard/pages/dashboard-page/dashboard-page.component';
import { PropertyEventsPageComponent } from './dashboard/pages/property-events-page/property-events-page.component';
import { PropertyManagementPageComponent } from './dashboard/pages/property-management-page/property-management-page.component';
import { PropertyMonthlyReportPageComponent } from './dashboard/pages/property-monthly-report-page/property-monthly-report-page.component';
import { PropertyMovementsPageComponent } from './dashboard/pages/property-movements-page/property-movements-page.component';
import { TenantAssignmentPageComponent } from './dashboard/pages/tenant-assignment-page/tenant-assignment-page.component';
import { ContactManagementPageComponent } from './dashboard/pages/contact-management-page/contact-management-page.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPageComponent },
  { path: 'propiedades', component: PropertyManagementPageComponent },
  { path: 'propiedades/:id/eventos', component: PropertyEventsPageComponent },
  { path: 'propiedades/:id/movimientos', component: PropertyMovementsPageComponent },
  { path: 'reportes', component: PropertyMonthlyReportPageComponent },
  { path: 'contactos', component: ContactManagementPageComponent },
  { path: 'asignaciones', component: TenantAssignmentPageComponent },
  { path: '**', redirectTo: 'dashboard' }
];
