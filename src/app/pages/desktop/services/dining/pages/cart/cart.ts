import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { CartItem } from '../../models/menu.models';
import { CartSummary } from '../../components/cart-summary/cart-summary';
import { QuantitySelector } from '../../components/quantity-selector/quantity-selector';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, CartSummary, QuantitySelector],
  templateUrl: './cart.html',
  styleUrls: ['./cart.css']
})
export class Cart implements OnInit {
  resourceType = 'table';
  resourceId = '';
  cartItems: CartItem[] = [];
  isMobile = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public cartService: CartService,
  ) {}

  ngOnInit(): void {
    this.isMobile = window.innerWidth < 768;
    const url = this.router.url;
    this.resourceType = url.includes('/room/') ? 'room' : 'table';
    this.route.params.subscribe(params => {
      this.resourceId = params['id'];
    });
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
    });
  }

  updateQuantity(itemId: number, qty: number): void {
    this.cartService.updateQuantity(itemId, qty);
  }

  removeItem(itemId: number): void {
    this.cartService.removeItem(itemId);
  }

  updateInstructions(itemId: number, instructions: string): void {
    this.cartService.updateInstructions(itemId, instructions);
  }

  proceedToCheckout(): void {
    const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(`${base}/checkout`);
  }

  continueShopping(): void {
    const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(`${base}/menu`);
  }
}
