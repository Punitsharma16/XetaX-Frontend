import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.models';

@Component({
  selector: 'app-hotel-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hotel-dashboard.html',
  styleUrls: ['./hotel-dashboard.css']
})
export class HotelDashboard implements OnInit {
  resourceId = '';
  roomInfo = { number: '', type: 'Deluxe', floor: 2 };
  activeOrders: Order[] = [];
  currentBillAmount = 0;

  quickActions = [
    { label: 'Order Food', icon: 'bi-basket', color: '#3b82f6', bgColor: '#eff6ff', route: 'menu' },
    { label: 'Schedule Delivery', icon: 'bi-calendar-event', color: '#8b5cf6', bgColor: '#f5f3ff', route: 'schedule' },
    { label: 'Current Bill', icon: 'bi-receipt', color: '#22c55e', bgColor: '#f0fdf4', route: 'bill' },
    { label: 'Room Service', icon: 'bi-bell', color: '#f59e0b', bgColor: '#fefce8', route: 'dashboard' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private customerService: CustomerService,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.resourceId = params['id'];
      this.roomInfo.number = this.resourceId.replace('RM', '');
      this.loadData();
    });
  }

  loadData(): void {
    this.orderService.orders$.subscribe(orders => {
      this.activeOrders = orders.filter(o => o.resourceId === this.resourceId && o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
      this.currentBillAmount = orders
        .filter(o => o.resourceId === this.resourceId)
        .reduce((sum, o) => sum + o.grandTotal, 0);
    });
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(`/pages/dining/room/${this.resourceId}/${route}`);
  }

  goBack(): void {
    this.router.navigateByUrl(`/pages/dining/room/${this.resourceId}`);
  }
}
