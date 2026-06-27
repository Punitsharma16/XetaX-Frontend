import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MenuService } from '../../services/menu.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { CustomerService } from '../../services/customer.service';
import { MenuItem } from '../../models/menu.models';
import { MenuItemCard } from '../../components/menu-item-card/menu-item-card';

@Component({
  selector: 'app-schedule-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule, MenuItemCard],
  templateUrl: './schedule-delivery.html',
  styleUrls: ['./schedule-delivery.css']
})
export class ScheduleDelivery implements OnInit {
  resourceId = '';
  menuItems: MenuItem[] = [];
  selectedItems: { item: MenuItem; quantity: number }[] = [];
  deliveryTime = '30';
  customTime = '';
  notes = '';
  isLoading = true;
  submitting = false;

  timeOptions = [
    { value: '0', label: 'Now (ASAP)' },
    { value: '30', label: '30 Minutes' },
    { value: '60', label: '1 Hour' },
    { value: 'custom', label: 'Custom Time' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private menuService: MenuService,
    private cartService: CartService,
    private orderService: OrderService,
    private customerService: CustomerService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.resourceId = params['id'];
      this.loadMenu();
    });
  }

  loadMenu(): void {
    this.menuService.getMenuItems().subscribe(items => {
      this.menuItems = items.filter(i => i.categoryName !== 'Beverages');
      this.isLoading = false;
    });
  }

  toggleItem(item: MenuItem): void {
    const existing = this.selectedItems.find(s => s.item.id === item.id);
    if (existing) {
      this.selectedItems = this.selectedItems.filter(s => s.item.id !== item.id);
    } else {
      this.selectedItems.push({ item, quantity: 1 });
    }
  }

  updateQuantity(itemId: number, qty: number): void {
    const existing = this.selectedItems.find(s => s.item.id === itemId);
    if (existing) {
      if (qty <= 0) {
        this.selectedItems = this.selectedItems.filter(s => s.item.id !== itemId);
      } else {
        existing.quantity = qty;
      }
    }
  }

  isSelected(itemId: number): boolean {
    return this.selectedItems.some(s => s.item.id === itemId);
  }

  getSelectedQuantity(itemId: number): number {
    return this.selectedItems.find(s => s.item.id === itemId)?.quantity || 0;
  }

  get totalItems(): number {
    return this.selectedItems.reduce((a, b) => a + b.quantity, 0);
  }

  get selectedTotal(): number {
    return this.selectedItems.reduce((a, b) => a + b.item.price * b.quantity, 0);
  }

  submitSchedule(): void {
    if (this.selectedItems.length === 0) return;
    this.submitting = true;

    // Add each item to cart first
    for (const s of this.selectedItems) {
      for (let i = 0; i < s.quantity; i++) {
        this.cartService.addToCart(s.item);
      }
    }

    const session = this.customerService.getSession();
    this.orderService.placeOrder(
      session?.customerName || 'Guest',
      session?.customerMobile || '',
      'room',
      this.resourceId,
      'ONLINE',
      this.notes,
      this.customTime || this.deliveryTime,
    ).subscribe(order => {
      this.submitting = false;
      const base = `/pages/dining/room/${this.resourceId}`;
      this.router.navigateByUrl(`${base}/success/${order.id}`);
    });
  }

  goBack(): void {
    this.router.navigateByUrl(`/pages/dining/room/${this.resourceId}/dashboard`);
  }
}
