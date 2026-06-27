import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Order, OrderItem } from '../../models/order.models';

interface CustomerRecord {
  mobile: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
  lastVisit: string;
  orders: Order[];
}

@Component({
  selector: 'app-user-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-history.html',
  styleUrls: ['./user-history.css'],
})
export class UserHistory {
  searchMobile = '';
  searched = false;
  customer: CustomerRecord | null = null;
  selectedOrder: Order | null = null;

  constructor(private router: Router) {}

  private readonly mockData: CustomerRecord[] = [
    {
      mobile: '9876543210',
      name: 'Rahul Sharma',
      totalOrders: 5,
      totalSpent: 4250,
      lastVisit: '2026-06-15T20:30:00',
      orders: [
        { id: 'ORD001', resourceType: 'table', resourceId: 'TBL003', customerName: 'Rahul Sharma', customerMobile: '9876543210', items: [{ menuItemId: 1, name: 'Margherita Pizza', quantity: 2, price: 299, specialInstructions: '' }, { menuItemId: 10, name: 'Masala Chai', quantity: 2, price: 99, specialInstructions: '' }], subtotal: 796, tax: 40, grandTotal: 836, status: 'COMPLETED', paymentMethod: 'UPI_QR', paymentStatus: 'SUCCESS', estimatedTime: 25, notes: '', scheduledTime: null, createdAt: '2026-06-15T20:00:00', updatedAt: '2026-06-15T20:45:00' },
        { id: 'ORD002', resourceType: 'table', resourceId: 'TBL001', customerName: 'Rahul Sharma', customerMobile: '9876543210', items: [{ menuItemId: 6, name: 'Butter Chicken', quantity: 1, price: 399, specialInstructions: 'Extra spicy' }, { menuItemId: 7, name: 'Dal Makhani', quantity: 1, price: 279, specialInstructions: '' }, { menuItemId: 9, name: 'Naan Bread', quantity: 3, price: 49, specialInstructions: '' }], subtotal: 825, tax: 41, grandTotal: 866, status: 'COMPLETED', paymentMethod: 'ONLINE', paymentStatus: 'SUCCESS', estimatedTime: 30, notes: '', scheduledTime: null, createdAt: '2026-06-10T19:30:00', updatedAt: '2026-06-10T20:15:00' },
        { id: 'ORD003', resourceType: 'table', resourceId: 'TBL005', customerName: 'Rahul Sharma', customerMobile: '9876543210', items: [{ menuItemId: 3, name: 'Paneer Tikka', quantity: 1, price: 249, specialInstructions: '' }], subtotal: 249, tax: 12, grandTotal: 261, status: 'COMPLETED', paymentMethod: 'UPI_QR', paymentStatus: 'SUCCESS', estimatedTime: 15, notes: '', scheduledTime: null, createdAt: '2026-06-05T18:00:00', updatedAt: '2026-06-05T18:20:00' },
      ],
    },
    {
      mobile: '8765432109',
      name: 'Priya Patel',
      totalOrders: 3,
      totalSpent: 3150,
      lastVisit: '2026-06-14T21:00:00',
      orders: [
        { id: 'ORD004', resourceType: 'room', resourceId: 'RM101', customerName: 'Priya Patel', customerMobile: '8765432109', items: [{ menuItemId: 2, name: 'Pepperoni Pizza', quantity: 1, price: 399, specialInstructions: '' }, { menuItemId: 12, name: 'Mango Lassi', quantity: 2, price: 129, specialInstructions: '' }], subtotal: 657, tax: 33, grandTotal: 690, status: 'COMPLETED', paymentMethod: 'ONLINE', paymentStatus: 'SUCCESS', estimatedTime: 25, notes: '', scheduledTime: null, createdAt: '2026-06-14T20:00:00', updatedAt: '2026-06-14T20:30:00' },
        { id: 'ORD005', resourceType: 'room', resourceId: 'RM101', customerName: 'Priya Patel', customerMobile: '8765432109', items: [{ menuItemId: 4, name: 'Chicken Wings', quantity: 2, price: 349, specialInstructions: '' }, { menuItemId: 11, name: 'Fresh Lime Soda', quantity: 1, price: 89, specialInstructions: '' }], subtotal: 787, tax: 39, grandTotal: 826, status: 'COMPLETED', paymentMethod: 'UPI_QR', paymentStatus: 'SUCCESS', estimatedTime: 18, notes: '', scheduledTime: null, createdAt: '2026-06-12T19:00:00', updatedAt: '2026-06-12T19:25:00' },
      ],
    },
    {
      mobile: '7654321098',
      name: 'Amit Singh',
      totalOrders: 2,
      totalSpent: 1850,
      lastVisit: '2026-06-13T13:00:00',
      orders: [
        { id: 'ORD006', resourceType: 'table', resourceId: 'TBL002', customerName: 'Amit Singh', customerMobile: '7654321098', items: [{ menuItemId: 8, name: 'Biryani', quantity: 1, price: 329, specialInstructions: '' }, { menuItemId: 10, name: 'Masala Chai', quantity: 1, price: 99, specialInstructions: '' }], subtotal: 428, tax: 21, grandTotal: 449, status: 'COMPLETED', paymentMethod: 'UPI_QR', paymentStatus: 'SUCCESS', estimatedTime: 30, notes: '', scheduledTime: null, createdAt: '2026-06-13T12:00:00', updatedAt: '2026-06-13T12:40:00' },
      ],
    },
  ];

  search(): void {
    this.searched = true;
    this.selectedOrder = null;
    const mobile = this.searchMobile.trim();
    if (!mobile) {
      this.customer = null;
      return;
    }
    this.customer = this.mockData.find(c => c.mobile === mobile) || null;
  }

  viewOrder(order: Order): void {
    this.selectedOrder = order;
  }

  closeOrder(): void {
    this.selectedOrder = null;
  }

  viewOrderDetail(orderId: string): void {
    this.router.navigate(['/pages/dining/order', orderId]);
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      PENDING: 'bi-clock',
      PREPARING: 'bi-fire',
      READY: 'bi-check-circle',
      SERVED: 'bi-hand-thumbs-up',
      COMPLETED: 'bi-check-all',
      CANCELLED: 'bi-x-circle',
    };
    return icons[status] || 'bi-question-circle';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-warning',
      PREPARING: 'bg-info',
      READY: 'bg-success',
      SERVED: 'bg-primary',
      COMPLETED: 'bg-success',
      CANCELLED: 'bg-danger',
    };
    return classes[status] || 'bg-secondary';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
