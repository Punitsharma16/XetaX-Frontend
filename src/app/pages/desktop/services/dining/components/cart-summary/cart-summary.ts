import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-cart-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cart-summary.html',
  styleUrls: ['./cart-summary.css']
})
export class CartSummary {
  @Input() subtotal = 0;
  @Input() tax = 0;
  @Input() grandTotal = 0;
  @Input() itemCount = 0;
}
