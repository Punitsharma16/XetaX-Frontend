import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'accounts',
    loadComponent: () => import('./pages/account/account').then(c => c.Account),
  },
  {
    path: 'users',
    loadComponent: () => import('./pages/users/user').then(c => c.User),
  },
  {
    path: '',
    redirectTo: 'accounts',
    pathMatch: 'full',
  },
];
