import { Routes, CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { VacancyListComponent } from './components/vacancy-list/vacancy-list.component';
import { PreferencesComponent } from './components/preferences/preferences.component';
import { CsvImportComponent } from './components/csv-import/csv-import.component';
import { ReportsComponent } from './components/admin-reports/admin-reports.component';
import { LoginComponent } from './pages/login/login.component';
import { PdfPreferencesComponent } from './components/pdf-preferences/pdf-preferences.component';
import { AuthService } from './services/auth.service';

const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAdmin();
};

const doctorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isDoctor();
};

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'vacancies', component: VacancyListComponent },
  { path: 'preferences', component: PreferencesComponent, canActivate: [doctorGuard] },
  { path: 'pdf-preferences', component: PdfPreferencesComponent, canActivate: [doctorGuard] },
  { path: 'import', component: CsvImportComponent, canActivate: [adminGuard] },
  { path: 'reports', component: ReportsComponent }
];
