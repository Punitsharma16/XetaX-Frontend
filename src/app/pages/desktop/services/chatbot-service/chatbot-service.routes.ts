import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'bots',
    loadComponent: () => import('./pages/create-chatbot/create-chatbot').then(c => c.CreateChatbot),
  },
  {
    path: 'bots/:id/knowledge',
    loadComponent: () => import('./pages/knowledge/knowledge-base').then(c => c.KnowledgeBase),
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat-system/chat-system').then(c => c.ChatSystem),
  },
  {
    path: '',
    redirectTo: 'bots',
    pathMatch: 'full',
  },
];
