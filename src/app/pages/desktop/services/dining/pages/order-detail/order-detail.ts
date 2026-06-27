import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Order, OrderStatus } from '../../models/order.models';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-detail.html',
  styleUrls: ['./order-detail.css'],
})
export class OrderDetail implements OnInit {
  order: Order | null = null;
  timeline: { label: string; status: OrderStatus; completed: boolean }[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('orderId');
    if (orderId) {
      this.orderService.getOrderById(orderId).subscribe(order => {
        this.order = order || null;
        if (this.order) {
          this.buildTimeline();
        }
      });
    }
  }

  private buildTimeline(): void {
    const allSteps: { label: string; status: OrderStatus }[] = [
      { label: 'Order Placed', status: 'PENDING' },
      { label: 'Preparing', status: 'PREPARING' },
      { label: 'Ready', status: 'READY' },
      { label: 'Served', status: 'SERVED' },
      { label: 'Completed', status: 'COMPLETED' },
    ];

    const statusOrder: Record<OrderStatus, number> = {
      PENDING: 0,
      PREPARING: 1,
      READY: 2,
      SERVED: 3,
      COMPLETED: 4,
      CANCELLED: -1,
    };

    const currentIdx = statusOrder[this.order!.status];
    this.timeline = allSteps.map((step, idx) => ({
      ...step,
      completed: this.order!.status === 'CANCELLED'
        ? step.status === 'PENDING'
        : idx <= currentIdx,
    }));
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
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  goBack(): void {
    this.router.navigate(['/pages/dining/history']);
  }
}
