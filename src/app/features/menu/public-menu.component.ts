import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';

interface PublicItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  offerPrice: number | null;
  offerLabel: string | null;
  veg: boolean | null;
  available: boolean;
  imageUrl: string | null;
}

interface PublicCategory {
  id: number;
  name: string;
  description: string | null;
  items: PublicItem[];
}

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

interface PublicMenu {
  title: string | null;
  tagline: string | null;
  currency: string;
  orderTypes: OrderType[];
  categories: PublicCategory[];
}

interface OrderResult {
  ok: boolean;
  reference: string;
  total: number;
  message: string;
}

/**
 * The page a customer orders from (/menu/:key, optionally ?table=5 from a
 * table's QR code). No login.
 *
 * <p>Plain HttpClient rather than CrmApiService, so the auth interceptor never
 * sends an anonymous visitor to /login. The basket only ever holds item ids
 * and quantities — the server prices the order from the menu itself, so the
 * total shown here is a preview, never what is charged.
 */
@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-menu.component.html',
  styleUrl: './public-menu.component.css',
})
export class PublicMenuComponent {
  private readonly http = inject(HttpClient);

  readonly key = input.required<string>();
  /** Filled from a table's QR code. */
  readonly table = input<string | undefined>(undefined);

  readonly menu = signal<PublicMenu | null>(null);
  readonly notFound = signal(false);
  readonly activeCategory = signal<number | null>(null);
  readonly vegOnly = signal(false);

  /** itemId → quantity. */
  readonly basket = signal<Record<number, number>>({});

  readonly checkoutOpen = signal(false);
  readonly placing = signal(false);
  readonly error = signal('');
  readonly placed = signal<OrderResult | null>(null);

  orderType: OrderType = 'TAKEAWAY';
  name = '';
  phone = '';
  tableNo = '';
  address = '';
  note = '';

  readonly labels: Record<OrderType, string> = {
    DINE_IN: 'Dine-in',
    TAKEAWAY: 'Takeaway',
    DELIVERY: 'Delivery',
  };

  readonly symbol = computed(() => {
    const currency = this.menu()?.currency ?? 'INR';
    return currency === 'INR' ? '₹' : currency + ' ';
  });

  readonly sections = computed(() => {
    const menu = this.menu();
    if (!menu) return [];
    if (!this.vegOnly()) return menu.categories;
    return menu.categories
      .map((category) => ({ ...category, items: category.items.filter((item) => item.veg === true) }))
      .filter((category) => category.items.length);
  });

  private readonly itemsById = computed(() => {
    const map = new Map<number, PublicItem>();
    for (const category of this.menu()?.categories ?? []) {
      for (const item of category.items) map.set(item.id, item);
    }
    return map;
  });

  readonly lines = computed(() => {
    const items = this.itemsById();
    return Object.entries(this.basket())
      .map(([id, quantity]) => ({ item: items.get(Number(id)), quantity }))
      .filter((line): line is { item: PublicItem; quantity: number } => !!line.item && line.quantity > 0);
  });

  readonly count = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));

  /** A preview only — the server recomputes the total from the menu. */
  readonly total = computed(() =>
    this.lines().reduce((sum, line) => sum + this.unitPrice(line.item) * line.quantity, 0));

  readonly hasVeg = computed(() =>
    (this.menu()?.categories ?? []).some((category) => category.items.some((item) => item.veg === true)));

  constructor() {
    effect(() => {
      const key = this.key();
      if (!key) return;
      this.restoreBasket(key);
      this.http.get<{ data: PublicMenu }>(`${environment.crmBaseUrl}/api/public/menu/${encodeURIComponent(key)}`)
        .subscribe({
          next: (res) => {
            this.menu.set(res.data);
            this.orderType = this.table() && res.data.orderTypes.includes('DINE_IN')
              ? 'DINE_IN'
              : this.defaultOrderType(res.data.orderTypes);
            this.dropMissingItems();
          },
          error: () => this.notFound.set(true),
        });
    });

    // Only the table in the QR link is copied here. The order type is decided
    // where the menu lands, so a reload of the menu cannot overwrite what the
    // guest has already picked.
    effect(() => {
      const table = this.table();
      if (table) this.tableNo = table;
    });

    // Keep the basket across an accidental refresh on a phone.
    effect(() => {
      const basket = this.basket();
      const key = this.key();
      try {
        localStorage.setItem(this.storageKey(key), JSON.stringify(basket));
      } catch {
        // Private mode or blocked storage — the basket simply does not persist.
      }
    });
  }

  private defaultOrderType(types: OrderType[]): OrderType {
    if (this.table() && types.includes('DINE_IN')) return 'DINE_IN';
    return types.includes('TAKEAWAY') ? 'TAKEAWAY' : types[0] ?? 'TAKEAWAY';
  }

  private storageKey(key: string): string {
    return `xetax-menu-basket:${key}`;
  }

  private restoreBasket(key: string): void {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey(key)) ?? '{}');
      if (saved && typeof saved === 'object') this.basket.set(saved);
    } catch {
      this.basket.set({});
    }
  }

  /** A dish removed or sold out since the basket was saved is dropped quietly. */
  private dropMissingItems(): void {
    const items = this.itemsById();
    this.basket.update((basket) => {
      const next: Record<number, number> = {};
      for (const [id, quantity] of Object.entries(basket)) {
        const item = items.get(Number(id));
        if (item?.available && quantity > 0) next[Number(id)] = Math.min(quantity, 50);
      }
      return next;
    });
  }

  unitPrice(item: PublicItem): number {
    return item.offerPrice ?? item.price;
  }

  quantity(item: PublicItem): number {
    return this.basket()[item.id] ?? 0;
  }

  add(item: PublicItem): void {
    if (!item.available) return;
    this.basket.update((basket) => ({ ...basket, [item.id]: Math.min((basket[item.id] ?? 0) + 1, 50) }));
  }

  remove(item: PublicItem): void {
    this.basket.update((basket) => {
      const next = { ...basket };
      const quantity = (next[item.id] ?? 0) - 1;
      if (quantity > 0) next[item.id] = quantity;
      else delete next[item.id];
      return next;
    });
  }

  jumpTo(categoryId: number): void {
    this.activeCategory.set(categoryId);
    document.getElementById(`menu-cat-${categoryId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openCheckout(): void {
    if (!this.count()) return;
    this.error.set('');
    this.checkoutOpen.set(true);
  }

  placeOrder(): void {
    this.error.set('');
    if (!this.name.trim()) { this.error.set('Please enter your name.'); return; }
    const digits = this.phone.replace(/\D/g, '');
    if (digits.length < 10) { this.error.set('Please enter a 10-digit mobile number.'); return; }
    if (this.orderType === 'DELIVERY' && !this.address.trim()) {
      this.error.set('Please enter the delivery address.');
      return;
    }

    this.placing.set(true);
    const body = {
      items: this.lines().map((line) => ({ itemId: line.item.id, quantity: line.quantity })),
      name: this.name.trim(),
      phone: this.phone.trim(),
      orderType: this.orderType,
      table: this.orderType === 'DINE_IN' ? this.tableNo.trim() : '',
      address: this.orderType === 'DELIVERY' ? this.address.trim() : '',
      note: this.note.trim(),
    };
    this.http.post<{ data: OrderResult }>(
      `${environment.crmBaseUrl}/api/public/menu/${encodeURIComponent(this.key())}/orders`, body,
    ).subscribe({
      next: (res) => {
        this.placing.set(false);
        this.placed.set(res.data);
        this.checkoutOpen.set(false);
        this.basket.set({});
      },
      error: (err) => {
        this.placing.set(false);
        this.error.set(err?.error?.message || 'Could not place the order. Please try again.');
      },
    });
  }

  orderAgain(): void {
    this.placed.set(null);
    this.note = '';
  }
}
