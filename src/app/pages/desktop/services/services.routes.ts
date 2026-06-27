import { Routes } from '@angular/router';

export const routes: Routes = [
  // ── Default: Service Landing Page ──
  {
    path: '',
    loadComponent: () => import('./service-landing/service-landing').then(c => c.ServiceLanding),
  },

  // ── Redirects for old flat URLs (backward compatibility) ──
  {
    path: 'user',
    redirectTo: 'account/users',
    pathMatch: 'full',
  },
  {
    path: 'account',
    redirectTo: 'account/accounts',
    pathMatch: 'full',
  },
  {
    path: 'bot',
    redirectTo: 'chatbot/bots',
    pathMatch: 'full',
  },
  {
    path: 'bot/:id/knowledge',
    redirectTo: 'chatbot/bots/:id/knowledge',
  },
  {
    path: 'chat',
    redirectTo: 'chatbot/chat',
    pathMatch: 'full',
  },
  {
    path: 'lead',
    redirectTo: 'crm/lead',
    pathMatch: 'full',
  },
  {
    path: 'task',
    redirectTo: 'crm/task',
    pathMatch: 'full',
  },
  {
    path: 'contact',
    redirectTo: 'crm/contact',
    pathMatch: 'full',
  },
  {
    path: 'sources',
    redirectTo: 'crm/sources',
    pathMatch: 'full',
  },
  {
    path: 'stages',
    redirectTo: 'crm/stages',
    pathMatch: 'full',
  },
  {
    path: 'field',
    redirectTo: 'crm/field',
    pathMatch: 'full',
  },
  {
    path: 'events',
    redirectTo: 'crm/events',
    pathMatch: 'full',
  },
  {
    path: 'documents',
    redirectTo: 'crm/documents',
    pathMatch: 'full',
  },
  {
    path: 'profile',
    loadComponent: () => import('../sidebar/profile/profile').then(c => c.Profile),
  },

  // ── Official Service Modules ──
  {
    path: 'account',
    loadChildren: () => import('./account-service/account-service.routes').then(r => r.routes),
  },
  {
    path: 'chatbot',
    loadChildren: () => import('./chatbot-service/chatbot-service.routes').then(r => r.routes),
  },
  {
    path: 'crm',
    loadChildren: () => import('./crm-service/crm-service.routes').then(r => r.routes),
  },
  {
    path: 'dining',
    loadChildren: () => import('./dining/dining.routes').then(r => r.routes),
  },
  {
    path: 'voice',
    loadChildren: () => import('./voice-service/voice-service.routes').then(r => r.routes),
  },
];
