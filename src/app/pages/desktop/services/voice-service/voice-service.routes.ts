import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/voice-input/voice-input').then(c => c.VoiceInput),
  },
];
