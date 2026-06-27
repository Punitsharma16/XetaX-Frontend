import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CartItem, MenuItem } from '../models/menu.models';

@Injectable({ providedIn: 'root' })
export class CartService {

  private cartItems = new BehaviorSubject<CartItem[]>([]);
  cartItems$ = this.cartItems.asObservable();

  private taxRate = 0.05;

  get cartCount(): number {
    return this.cartItems.value.reduce((sum, item) => sum + item.quantity, 0);
  }

  get subtotal(): number {
    return this.cartItems.value.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  }

  get tax(): number {
    return Math.round(this.subtotal * this.taxRate);
  }

  get grandTotal(): number {
    return this.subtotal + this.tax;
  }

  addToCart(menuItem: MenuItem, quantity = 1, instructions = ''): void {
    const current = this.cartItems.value;
    const existing = current.find(i => i.menuItem.id === menuItem.id);
    if (existing) {
      existing.quantity += quantity;
      if (instructions) existing.specialInstructions = instructions;
      this.cartItems.next([...current]);
    } else {
      this.cartItems.next([...current, { menuItem, quantity, specialInstructions: instructions }]);
    }
  }

  updateQuantity(itemId: number, quantity: number): void {
    const current = this.cartItems.value;
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }
    const item = current.find(i => i.menuItem.id === itemId);
    if (item) {
      item.quantity = quantity;
      this.cartItems.next([...current]);
    }
  }

  removeItem(itemId: number): void {
    this.cartItems.next(this.cartItems.value.filter(i => i.menuItem.id !== itemId));
  }

  updateInstructions(itemId: number, instructions: string): void {
    const current = this.cartItems.value;
    const item = current.find(i => i.menuItem.id === itemId);
    if (item) {
      item.specialInstructions = instructions;
      this.cartItems.next([...current]);
    }
  }

  clearCart(): void {
    this.cartItems.next([]);
  }

  getCartSnapshot(): CartItem[] {
    return [...this.cartItems.value];
  }
}
