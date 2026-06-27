import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-service-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-selection.html',
  styleUrls: ['./service-selection.css']
})
export class ServiceSelection {

  services = [
    {
      type: 'table',
      title: 'Restaurant Dining',
      description: 'Order food from your table. Browse our menu, place orders, and enjoy your meal.',
      icon: 'bi-shop',
      color: '#3b82f6',
      bgColor: '#eff6ff',
      route: '/pages/dining/table/TBL001',
    },
    {
      type: 'room',
      title: 'Hotel Room Service',
      description: 'Order food to your room. Schedule delivery, view your bill, and more.',
      icon: 'bi-building',
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      route: '/pages/dining/room/RM101',
    },
  ];

  constructor(private router: Router) {}

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }
}
