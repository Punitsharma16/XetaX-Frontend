import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/service-selection/service-selection').then(c => c.ServiceSelection),
  },
  {
    path: 'tables',
    loadComponent: () => import('./pages/table-management/table-management').then(c => c.TableManagement),
  },
  {
    path: 'menu',
    loadComponent: () => import('./pages/menu-management/menu-management').then(c => c.MenuManagement),
  },
  {
    path: 'orders',
    loadComponent: () => import('./pages/orders/orders').then(c => c.Orders),
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/user-history/user-history').then(c => c.UserHistory),
  },
  {
    path: 'order/:orderId',
    loadComponent: () => import('./pages/order-detail/order-detail').then(c => c.OrderDetail),
  },
  {
    path: 'table/:id',
    loadComponent: () => import('./pages/landing/landing').then(c => c.Landing),
  },
  {
    path: 'table/:id/menu',
    loadComponent: () => import('./pages/menu/menu').then(c => c.Menu),
  },
  {
    path: 'table/:id/cart',
    loadComponent: () => import('./pages/cart/cart').then(c => c.Cart),
  },
  {
    path: 'table/:id/checkout',
    loadComponent: () => import('./pages/checkout/checkout').then(c => c.Checkout),
  },
  {
    path: 'table/:id/payment/:orderId',
    loadComponent: () => import('./pages/payment/payment').then(c => c.Payment),
  },
  {
    path: 'table/:id/success/:orderId',
    loadComponent: () => import('./pages/order-success/order-success').then(c => c.OrderSuccess),
  },
  {
    path: 'room/:id',
    loadComponent: () => import('./pages/landing/landing').then(c => c.Landing),
  },
  {
    path: 'room/:id/menu',
    loadComponent: () => import('./pages/menu/menu').then(c => c.Menu),
  },
  {
    path: 'room/:id/cart',
    loadComponent: () => import('./pages/cart/cart').then(c => c.Cart),
  },
  {
    path: 'room/:id/checkout',
    loadComponent: () => import('./pages/checkout/checkout').then(c => c.Checkout),
  },
  {
    path: 'room/:id/payment/:orderId',
    loadComponent: () => import('./pages/payment/payment').then(c => c.Payment),
  },
  {
    path: 'room/:id/success/:orderId',
    loadComponent: () => import('./pages/order-success/order-success').then(c => c.OrderSuccess),
  },
  {
    path: 'room/:id/dashboard',
    loadComponent: () => import('./pages/hotel-dashboard/hotel-dashboard').then(c => c.HotelDashboard),
  },
  {
    path: 'room/:id/schedule',
    loadComponent: () => import('./pages/schedule-delivery/schedule-delivery').then(c => c.ScheduleDelivery),
  },
  {
    path: 'room/:id/bill',
    loadComponent: () => import('./pages/current-bill/current-bill').then(c => c.CurrentBillPage),
  },
];
