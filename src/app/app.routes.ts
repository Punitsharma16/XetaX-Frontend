import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadChildren: () => import('./pages/login/login.routes').then(routes => routes.routes),
    },
    {
        path: 'pages',
        loadChildren: () => import('./pages/desktop/desktop.routes').then(routes => routes.routes),
    },
];
