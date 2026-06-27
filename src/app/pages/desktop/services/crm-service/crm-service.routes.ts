import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'lead',
    loadComponent: () => import('./pages/lead/lead').then(c => c.Lead),
  },
  {
    path: 'task',
    loadComponent: () => import('./pages/tasks/tasks').then(c => c.Tasks),
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then(c => c.Contact),
  },
  {
    path: 'sources',
    loadComponent: () => import('./pages/sources/sources').then(c => c.Sources),
  },
  {
    path: 'stages',
    loadComponent: () => import('./pages/stages/stages').then(c => c.Stages),
  },
  {
    path: 'field',
    loadComponent: () => import('./pages/dnyamic-field/dnyamic-field').then(c => c.DnyamicField),
  },
  {
    path: 'events',
    loadComponent: () => import('./pages/events/events').then(c => c.Events),
  },
  {
    path: 'documents',
    loadComponent: () => import('./pages/documents/documents').then(c => c.Documents),
  },
  {
    path: '',
    redirectTo: 'lead',
    pathMatch: 'full',
  },
];
