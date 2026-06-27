import { Routes } from '@angular/router';
import { Sidebar } from './sidebar/sidebar';

export const routes: Routes = [
    {
        path: '',
        component: Sidebar,
        loadChildren: () => import('./services/services.routes').then(routes => routes.routes),
    },
];
