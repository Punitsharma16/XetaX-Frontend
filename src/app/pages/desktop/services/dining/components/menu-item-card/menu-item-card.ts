import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MenuItem } from '../../models/menu.models';

@Component({
  selector: 'app-menu-item-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-item-card.html',
  styleUrls: ['./menu-item-card.css']
})
export class MenuItemCard {
  @Input() item!: MenuItem;
  @Input() quantity = 0;
  @Output() addToCart = new EventEmitter<MenuItem>();
  @Output() increment = new EventEmitter<MenuItem>();
  @Output() decrement = new EventEmitter<MenuItem>();
}
