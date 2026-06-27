import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest } from 'rxjs';
import { BaseService } from '../../../../../../acore/base/base.service';
import { Loader } from '../../../../../../acore/components/loader/loader';
import { MenuService } from '../../services/menu.service';
import { CartService } from '../../services/cart.service';
import { MenuCategory, MenuItem } from '../../models/menu.models';
import { MenuItemCard } from '../../components/menu-item-card/menu-item-card';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, Loader, MenuItemCard],
  templateUrl: './menu.html',
  styleUrls: ['./menu.css']
})
export class Menu implements OnInit {
  resourceType = 'table';
  resourceId = '';
  categories: MenuCategory[] = [];
  menuItems: MenuItem[] = [];
  filteredItems: MenuItem[] = [];
  selectedCategory: number | null = null;
  searchQuery = '';
  cartItemCount = 0;
  isMobile = false;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private menuService: MenuService,
    private cartService: CartService,
    private service: BaseService,
  ) {}

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  ngOnInit(): void {
    this.isMobile = window.innerWidth < 768;
    const url = this.router.url;
    this.resourceType = url.includes('/room/') ? 'room' : 'table';
    this.route.params.subscribe(params => {
      this.resourceId = params['id'];
      this.loadData();
    });
    this.cartService.cartItems$.subscribe(() => {
      this.cartItemCount = this.cartService.cartCount;
    });
  }

  loadData(): void {
    this.isLoading = true;
    this.service.showLoader();
    combineLatest([
      this.menuService.getCategories(),
      this.menuService.getMenuItems()
    ]).subscribe(([cats, items]) => {
      this.categories = cats;
      this.menuItems = items;
      this.applyFilters();
      this.isLoading = false;
      this.service.hideLoader();
    });
  }

  selectCategory(categoryId: number | null): void {
    this.selectedCategory = categoryId;
    this.applyFilters();
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let items = this.menuItems;
    if (this.selectedCategory !== null) {
      items = items.filter(i => i.categoryId === this.selectedCategory);
    }
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
      );
    }
    this.filteredItems = items;
  }

  addToCart(item: MenuItem): void {
    this.cartService.addToCart(item);
  }

  incrementItem(item: MenuItem): void {
    const cartItem = this.cartService.getCartSnapshot().find(i => i.menuItem.id === item.id);
    this.cartService.addToCart(item, 1);
  }

  decrementItem(item: MenuItem): void {
    const cartItem = this.cartService.getCartSnapshot().find(i => i.menuItem.id === item.id);
    if (cartItem) {
      this.cartService.updateQuantity(item.id, cartItem.quantity - 1);
    }
  }

  getItemQuantity(itemId: number): number {
    const cartItem = this.cartService.getCartSnapshot().find(i => i.menuItem.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  }

  goToCart(): void {
    const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(`${base}/cart`);
  }

  goBack(): void {
    const base = this.resourceType === 'table' ? `/pages/dining/table/${this.resourceId}` : `/pages/dining/room/${this.resourceId}`;
    this.router.navigateByUrl(base);
  }

  trackById(index: number, item: MenuItem | MenuCategory): number {
    return item.id;
  }
}
