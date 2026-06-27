import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order, PaymentMethod, PaymentStatus } from '../../models/order.models';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.html',
  styleUrls: ['./payment.css']
})
export class Payment implements OnInit {
  resourceType: 'table' | 'room' = 'table';
  resourceId = '';
  orderId = '';
  order: Order | null = null;
  paymentStatus: PaymentStatus = 'PENDING';
  isProcessing = false;
  upiQrImage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    const url = this.router.url;
    this.resourceType = url.includes('/room/') ? 'room' : 'table';
    this.route.params.subscribe(params => {
      this.resourceId = params['id'];
      this.orderId = params['orderId'];
      this.loadOrder();
    });
  }

  loadOrder(): void {
    this.orderService.getOrderById(this.orderId).subscribe(order => {
      if (order) {
        this.order = order;
        this.paymentStatus = order.paymentStatus;
      }
    });
  }

  // TODO: Integrate with actual payment gateway
  processOnlinePayment(): void {
    this.isProcessing = true;
    // Simulate payment processing
    setTimeout(() => {
      this.paymentStatus = 'SUCCESS';
      this.isProcessing = false;
      if (this.order) {
        this.order.paymentStatus = 'SUCCESS';
        this.order.status = 'PENDING';
      }
    }, 2000);
  }

  // TODO: Customer marks UPI payment as completed
  confirmUpiPayment(): void {
    this.isProcessing = true;
    setTimeout(() => {
      this.paymentStatus = 'SUCCESS';
      this.isProcessing = false;
      if (this.order) {
        this.order.paymentStatus = 'SUCCESS';
        this.order.status = 'PENDING';
      }
    }, 1500);
  }

  goToSuccess(): void {
    const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(`${base}/success/${this.orderId}`);
  }

  retryPayment(): void {
    this.paymentStatus = 'PENDING';
  }

  goBack(): void {
    const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(`${base}/checkout`);
  }
}
