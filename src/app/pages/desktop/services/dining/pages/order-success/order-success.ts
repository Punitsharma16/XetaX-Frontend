import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { Order } from '../../models/order.models';

@Component({
  selector: 'app-order-success',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-success.html',
  styleUrls: ['./order-success.css']
})
export class OrderSuccess implements OnInit {
  resourceType: 'table' | 'room' = 'table';
  resourceId = '';
  orderId = '';
  order: Order | null = null;

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
      this.orderService.getOrderById(this.orderId).subscribe(order => {
        this.order = order ?? null;
      });
    });
  }

  backToMenu(): void {
    const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(`${base}/menu`);
  }
}
