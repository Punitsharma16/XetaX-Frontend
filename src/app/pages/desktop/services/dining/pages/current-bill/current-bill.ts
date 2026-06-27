import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../services/order.service';
import { CurrentBill } from '../../models/order.models';

@Component({
  selector: 'app-current-bill',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './current-bill.html',
  styleUrls: ['./current-bill.css']
})
export class CurrentBillPage implements OnInit {
  resourceId = '';
  bill: CurrentBill | null = null;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.resourceId = params['id'];
      this.loadBill();
    });
  }

  loadBill(): void {
    this.isLoading = true;
    this.orderService.getCurrentBill('room', this.resourceId).subscribe(bill => {
      this.bill = bill;
      this.isLoading = false;
    });
  }

  payNow(): void {
    // TODO: Integrate with payment gateway
    this.router.navigateByUrl(`/pages/dining/room/${this.resourceId}/menu`);
  }

  downloadBill(): void {
    // TODO: Implement bill download as PDF
    alert('Bill download feature coming soon. A PDF will be generated with the bill details.');
  }

  goBack(): void {
    this.router.navigateByUrl(`/pages/dining/room/${this.resourceId}/dashboard`);
  }
}
