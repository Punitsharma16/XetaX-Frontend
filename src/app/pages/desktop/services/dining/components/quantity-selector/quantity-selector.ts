import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-quantity-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quantity-selector.html',
  styleUrls: ['./quantity-selector.css']
})
export class QuantitySelector {
  @Input() quantity = 1;
  @Input() min = 1;
  @Input() max = 20;
  @Output() quantityChange = new EventEmitter<number>();

  increment(): void {
    if (this.quantity < this.max) {
      this.quantity++;
      this.quantityChange.emit(this.quantity);
    }
  }

  decrement(): void {
    if (this.quantity > this.min) {
      this.quantity--;
      this.quantityChange.emit(this.quantity);
    }
  }
}
