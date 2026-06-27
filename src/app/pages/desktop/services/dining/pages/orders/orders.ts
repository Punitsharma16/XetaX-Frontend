import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Order, OrderStatus } from '../../models/order.models';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.html',
  styleUrls: ['./orders.css'],
})
export class Orders implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  activeFilter: OrderStatus | 'ALL' = 'ALL';

  statusFilters: { key: OrderStatus | 'ALL'; label: string; icon: string }[] = [
    { key: 'ALL', label: 'All Orders', icon: 'bi-list' },
    { key: 'PENDING', label: 'Pending', icon: 'bi-clock' },
    { key: 'PREPARING', label: 'Preparing', icon: 'bi-fire' },
    { key: 'READY', label: 'Ready', icon: 'bi-check-circle' },
    { key: 'SERVED', label: 'Served', icon: 'bi-hand-thumbs-up' },
    { key: 'COMPLETED', label: 'Completed', icon: 'bi-check-all' },
  ];

  constructor(
    private orderService: OrderService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.seedSampleOrders();
    this.orderService.orders$.subscribe(orders => {
      this.orders = orders;
      this.applyFilter();
    });
  }

  private seedSampleOrders(): void {
    const existing = this.orderService['orders'].value;
    if (existing.length > 0) return;

    const sampleOrders: Order[] = [
      {
        id: 'ORD1001', resourceType: 'table', resourceId: 'TBL003',
        customerName: 'Rahul Sharma', customerMobile: '9876543210',
        items: [
          { menuItemId: 1, name: 'Margherita Pizza', quantity: 2, price: 299, specialInstructions: '' },
          { menuItemId: 10, name: 'Masala Chai', quantity: 2, price: 99, specialInstructions: '' },
        ],
        subtotal: 796, tax: 40, grandTotal: 836,
        status: 'PENDING', paymentMethod: 'UPI_QR', paymentStatus: 'PENDING',
        estimatedTime: 25, notes: '', scheduledTime: null,
        createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ORD1002', resourceType: 'table', resourceId: 'TBL001',
        customerName: 'Priya Patel', customerMobile: '8765432109',
        items: [
          { menuItemId: 6, name: 'Butter Chicken', quantity: 1, price: 399, specialInstructions: 'Extra spicy' },
          { menuItemId: 7, name: 'Dal Makhani', quantity: 1, price: 279, specialInstructions: '' },
          { menuItemId: 9, name: 'Naan Bread', quantity: 3, price: 49, specialInstructions: '' },
        ],
        subtotal: 825, tax: 41, grandTotal: 866,
        status: 'PREPARING', paymentMethod: 'ONLINE', paymentStatus: 'SUCCESS',
        estimatedTime: 20, notes: '', scheduledTime: null,
        createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ORD1003', resourceType: 'table', resourceId: 'TBL005',
        customerName: 'Amit Singh', customerMobile: '7654321098',
        items: [
          { menuItemId: 3, name: 'Paneer Tikka', quantity: 1, price: 249, specialInstructions: '' },
          { menuItemId: 11, name: 'Fresh Lime Soda', quantity: 1, price: 89, specialInstructions: '' },
        ],
        subtotal: 338, tax: 17, grandTotal: 355,
        status: 'PREPARING', paymentMethod: 'UPI_QR', paymentStatus: 'SUCCESS',
        estimatedTime: 15, notes: '', scheduledTime: null,
        createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ORD1004', resourceType: 'table', resourceId: 'TBL002',
        customerName: 'Neha Gupta', customerMobile: '6543210987',
        items: [
          { menuItemId: 4, name: 'Chicken Wings', quantity: 2, price: 349, specialInstructions: 'Extra crispy' },
          { menuItemId: 12, name: 'Mango Lassi', quantity: 2, price: 129, specialInstructions: '' },
        ],
        subtotal: 956, tax: 48, grandTotal: 1004,
        status: 'READY', paymentMethod: 'ONLINE', paymentStatus: 'SUCCESS',
        estimatedTime: 10, notes: '', scheduledTime: null,
        createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ORD1005', resourceType: 'room', resourceId: 'RM101',
        customerName: 'Vikram Mehta', customerMobile: '5432109876',
        items: [
          { menuItemId: 8, name: 'Biryani', quantity: 2, price: 329, specialInstructions: '' },
          { menuItemId: 10, name: 'Masala Chai', quantity: 2, price: 99, specialInstructions: '' },
        ],
        subtotal: 856, tax: 43, grandTotal: 899,
        status: 'SERVED', paymentMethod: 'UPI_QR', paymentStatus: 'SUCCESS',
        estimatedTime: 5, notes: 'Room service', scheduledTime: null,
        createdAt: new Date(Date.now() - 50 * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ORD1006', resourceType: 'table', resourceId: 'TBL006',
        customerName: 'Sneha Reddy', customerMobile: '4321098765',
        items: [
          { menuItemId: 2, name: 'Pepperoni Pizza', quantity: 1, price: 399, specialInstructions: '' },
        ],
        subtotal: 399, tax: 20, grandTotal: 419,
        status: 'PENDING', paymentMethod: 'UPI_QR', paymentStatus: 'PENDING',
        estimatedTime: 25, notes: '', scheduledTime: null,
        createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const current = this.orderService['orders'];
    current.next(sampleOrders);
  }

  applyFilter(): void {
    if (this.activeFilter === 'ALL') {
      this.filteredOrders = [...this.orders];
    } else {
      this.filteredOrders = this.orders.filter(o => o.status === this.activeFilter);
    }
  }

  setFilter(filter: OrderStatus | 'ALL'): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      PENDING: 'bi-clock', PREPARING: 'bi-fire', READY: 'bi-check-circle',
      SERVED: 'bi-hand-thumbs-up', COMPLETED: 'bi-check-all', CANCELLED: 'bi-x-circle',
    };
    return icons[status] || 'bi-question-circle';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-warning', PREPARING: 'bg-info', READY: 'bg-success',
      SERVED: 'bg-primary', COMPLETED: 'bg-success', CANCELLED: 'bg-danger',
    };
    return classes[status] || 'bg-secondary';
  }

  getCountForStatus(status: OrderStatus | 'ALL'): number {
    if (status === 'ALL') return this.orders.length;
    return this.orders.filter(o => o.status === status).length;
  }

  nextStatus(current: OrderStatus): OrderStatus | null {
    const flow: Record<OrderStatus, OrderStatus | null> = {
      PENDING: 'PREPARING', PREPARING: 'READY', READY: 'SERVED',
      SERVED: 'COMPLETED', COMPLETED: null, CANCELLED: null,
    };
    return flow[current] || null;
  }

  advanceOrder(order: Order): void {
    const next = this.nextStatus(order.status);
    if (next) {
      this.orderService.updateOrderStatus(order.id, next);
    }
  }

  viewDetail(orderId: string): void {
    this.router.navigate(['/pages/dining/order', orderId]);
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m ago`;
  }
}
