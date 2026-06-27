import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { CustomerService } from '../../services/customer.service';
import { CartSummary } from '../../components/cart-summary/cart-summary';
import { PaymentMethod } from '../../models/order.models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, CartSummary],
  templateUrl: './checkout.html',
  styleUrls: ['./checkout.css']
})
export class Checkout implements OnInit {
  resourceType: 'table' | 'room' = 'table';
  resourceId = '';

  customerName = '';
  customerMobile = '';
  selectedPayment: PaymentMethod = 'ONLINE';
  notes = '';
  isLoading = false;

  upiQrImage = ''; // TODO: Replace with actual uploaded QR from restaurant settings

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public cartService: CartService,
    private orderService: OrderService,
    private customerService: CustomerService,
  ) {}

  ngOnInit(): void {
    const url = this.router.url;
    this.resourceType = url.includes('/room/') ? 'room' : 'table';
    this.route.params.subscribe(params => {
      this.resourceId = params['id'];
    });

    const session = this.customerService.getSession();
    if (session) {
      this.customerName = session.customerName;
      this.customerMobile = session.customerMobile;
    }
  }

  selectPayment(method: PaymentMethod): void {
    this.selectedPayment = method;
  }

  placeOrder(): void {
    if (!this.customerName || !this.customerMobile) return;
    this.isLoading = true;

    // TODO: Replace with actual API integration
    this.orderService.placeOrder(
      this.customerName,
      this.customerMobile,
      this.resourceType,
      this.resourceId,
      this.selectedPayment,
      this.notes,
      null,
    ).subscribe(order => {
      this.customerService.saveCustomerInfo(this.customerName, this.customerMobile);
      this.isLoading = false;

      if (this.selectedPayment === 'ONLINE') {
        const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
        this.router.navigateByUrl(`${base}/payment/${order.id}`);
      } else {
        const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
        this.router.navigateByUrl(`${base}/payment/${order.id}`);
      }
    });
  }

  goBack(): void {
    document.querySelector('.btn-back')?.dispatchEvent(new Event('click'));
    const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(`${base}/cart`);
  }
}
