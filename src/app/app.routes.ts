import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent),
    canActivate: [noAuthGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register').then(m => m.RegisterComponent),
    canActivate: [noAuthGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: 'punch',
    loadComponent: () => import('./components/punch/punch').then(m => m.PunchComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '/login' },
];
