import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../shared/components/state/state-views.component';
import {
  ItemInput,
  MenuCategory,
  MenuItem,
  MenuOrderForm,
  MenuService,
  MenuStore,
} from './menu.service';

type Tab = 'items' | 'categories' | 'share';

interface ItemDraft {
  id: number | null;
  categoryId: number | null;
  name: string;
  description: string;
  price: number | null;
  offerPrice: number | null;
  offerLabel: string;
  veg: 'veg' | 'nonveg' | '';
  available: boolean;
}

/**
 * The owner's online menu: the dishes, the headings they sit under, the
 * offers, and the link and QR code customers open.
 *
 * <p>This page is the catalogue, and only the catalogue. Orders placed from
 * the public page are the one thing that becomes a record — they appear under
 * Records, in the Restaurant form, and nowhere here.
 */
@Component({
  selector: 'app-menu-admin',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    ModalComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-admin.component.html',
  styleUrl: './menu-admin.component.css',
})
export class MenuAdminComponent {
  private readonly menu = inject(MenuService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly busy = signal(false);
  readonly tab = signal<Tab>('items');

  readonly store = signal<MenuStore | null>(null);
  readonly orderForms = signal<MenuOrderForm[]>([]);
  readonly categories = signal<MenuCategory[]>([]);
  readonly items = signal<MenuItem[]>([]);

  /** Items tab filter; null shows every category. */
  readonly filterCategory = signal<number | null>(null);

  /** Settings form, edited locally and saved together. */
  settings = { title: '', tagline: '', formId: null as number | null, dineIn: true, takeaway: true, delivery: false };

  newCategoryName = '';
  newCategoryDescription = '';

  readonly categoryEditing = signal<MenuCategory | null>(null);
  categoryDraft = { name: '', description: '' };

  readonly itemOpen = signal(false);
  readonly itemSaving = signal(false);
  itemDraft: ItemDraft = this.blankItem();
  /** Photo picked in the modal; uploaded once the item exists. */
  private pendingPhoto: File | null = null;
  readonly pendingPhotoName = signal('');

  tableNumber = '';

  readonly hasOrderForm = computed(() => this.orderForms().length > 0);

  readonly itemCount = computed(() => {
    const counts = new Map<number, number>();
    for (const item of this.items()) counts.set(item.categoryId, (counts.get(item.categoryId) ?? 0) + 1);
    return counts;
  });

  /** Items grouped under their category, in menu order, honouring the filter. */
  readonly groups = computed(() => {
    const filter = this.filterCategory();
    return this.categories()
      .filter((category) => filter == null || category.id === filter)
      .map((category) => ({
        category,
        items: this.items().filter((item) => item.categoryId === category.id),
      }));
  });

  readonly qrPreview = computed(() => {
    const store = this.store();
    return store ? `${store.qrUrl}?size=320` : '';
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.menu.overview().subscribe({
      next: (overview) => {
        this.store.set(overview.store);
        this.orderForms.set(overview.orderForms);
        this.categories.set(overview.categories);
        this.items.set(overview.items);
        this.syncSettings(overview.store);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  private syncSettings(store: MenuStore): void {
    this.settings = {
      title: store.title ?? '',
      tagline: store.tagline ?? '',
      formId: store.formId,
      dineIn: store.dineIn,
      takeaway: store.takeaway,
      delivery: store.delivery,
    };
  }

  /* ------------------------------------------------------------ store */

  toggleLive(): void {
    const store = this.store();
    if (!store) return;
    const enabled = !store.enabled;
    if (enabled && !this.items().some((item) => item.available)) {
      this.toast.warning('Nothing to order yet', 'Add at least one available item before going live.');
      return;
    }
    this.busy.set(true);
    this.menu.updateStore({ enabled }).subscribe({
      next: ({ store: saved }) => {
        this.store.set(saved);
        this.busy.set(false);
        this.toast.success(saved.enabled ? 'Menu is live' : 'Menu switched off',
          saved.enabled ? 'Customers can order from your link now.' : 'The link shows nothing until you switch it back on.');
      },
      error: () => this.busy.set(false),
    });
  }

  saveSettings(): void {
    if (!this.settings.dineIn && !this.settings.takeaway && !this.settings.delivery) {
      this.toast.warning('Pick a way to order', 'Keep dine-in, takeaway or delivery switched on.');
      return;
    }
    this.busy.set(true);
    this.menu.updateStore({
      formId: this.settings.formId,
      title: this.settings.title,
      tagline: this.settings.tagline,
      dineIn: this.settings.dineIn,
      takeaway: this.settings.takeaway,
      delivery: this.settings.delivery,
    }).subscribe({
      next: ({ store }) => {
        this.store.set(store);
        this.syncSettings(store);
        this.busy.set(false);
        this.toast.success('Settings saved');
      },
      error: () => this.busy.set(false),
    });
  }

  regenerate(): void {
    this.confirm.ask({
      title: 'Create a new link?',
      message: 'The current link and every printed QR code stop working immediately. You will need to print new QR codes.',
      confirmText: 'Create new link',
      variant: 'danger',
    }).subscribe((ok) => {
      if (!ok) return;
      this.menu.regenerateKey().subscribe(({ store }) => {
        this.store.set(store);
        this.toast.success('New link created', 'Share it and print the new QR codes.');
      });
    });
  }

  copyLink(): void {
    const link = this.store()?.menuUrl;
    if (!link) return;
    navigator.clipboard?.writeText(link).then(
      () => this.toast.success('Link copied'),
      () => this.toast.error('Copy failed', 'Your browser blocked clipboard access.'),
    );
  }

  /** The QR for one table: scanning it opens the menu with that table filled in. */
  tableQr(download: boolean, size = 320): string {
    const store = this.store();
    const table = this.tableNumber.trim();
    if (!store || !table) return '';
    const params = new URLSearchParams({ table, size: String(size) });
    if (download) params.set('download', 'true');
    return `${store.qrUrl}?${params.toString()}`;
  }

  downloadUrl(): string {
    const store = this.store();
    return store ? `${store.qrUrl}?download=true&size=1024` : '';
  }

  /* ------------------------------------------------------- categories */

  addCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name) {
      this.toast.warning('Name the category', 'For example Starters, Main course or Drinks.');
      return;
    }
    this.menu.createCategory({ name, description: this.newCategoryDescription.trim() }).subscribe((category) => {
      this.categories.update((list) => [...list, category]);
      this.newCategoryName = '';
      this.newCategoryDescription = '';
      this.toast.success('Category added');
    });
  }

  editCategory(category: MenuCategory): void {
    this.categoryDraft = { name: category.name, description: category.description ?? '' };
    this.categoryEditing.set(category);
  }

  saveCategory(): void {
    const category = this.categoryEditing();
    if (!category) return;
    if (!this.categoryDraft.name.trim()) {
      this.toast.warning('Name the category');
      return;
    }
    this.menu.updateCategory(category.id, {
      name: this.categoryDraft.name.trim(),
      description: this.categoryDraft.description.trim(),
    }).subscribe((saved) => {
      this.replaceCategory(saved);
      this.categoryEditing.set(null);
      this.toast.success('Category saved');
    });
  }

  toggleCategory(category: MenuCategory): void {
    this.menu.updateCategory(category.id, { active: !category.active })
      .subscribe((saved) => this.replaceCategory(saved));
  }

  /** Swaps a category with its neighbour and saves both positions. */
  move(category: MenuCategory, direction: -1 | 1): void {
    const list = [...this.categories()];
    const index = list.findIndex((c) => c.id === category.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const ordered = list.map((c, position) => ({ ...c, sortOrder: position }));
    this.categories.set(ordered);
    for (const c of [ordered[index], ordered[target]]) {
      this.menu.updateCategory(c.id, { sortOrder: c.sortOrder }).subscribe();
    }
  }

  deleteCategory(category: MenuCategory): void {
    const count = this.itemCount().get(category.id) ?? 0;
    if (count > 0) {
      this.toast.warning('Category is not empty',
        `Move or delete the ${count} item${count === 1 ? '' : 's'} in "${category.name}" first.`);
      return;
    }
    this.confirm.confirmDelete(`category "${category.name}"`).subscribe((ok) => {
      if (!ok) return;
      this.menu.deleteCategory(category.id).subscribe(() => {
        this.categories.update((list) => list.filter((c) => c.id !== category.id));
        this.toast.success('Category deleted');
      });
    });
  }

  private replaceCategory(saved: MenuCategory): void {
    this.categories.update((list) => list.map((c) => (c.id === saved.id ? saved : c)));
  }

  categoryName(id: number): string {
    return this.categories().find((c) => c.id === id)?.name ?? '';
  }

  /* ------------------------------------------------------------ items */

  private blankItem(): ItemDraft {
    return {
      id: null, categoryId: null, name: '', description: '', price: null,
      offerPrice: null, offerLabel: '', veg: '', available: true,
    };
  }

  openNewItem(): void {
    if (!this.categories().length) {
      this.toast.warning('Add a category first', 'Every item sits under a category, like Starters.');
      this.tab.set('categories');
      return;
    }
    this.itemDraft = { ...this.blankItem(), categoryId: this.filterCategory() ?? this.categories()[0].id };
    this.clearPhoto();
    this.itemOpen.set(true);
  }

  openItem(item: MenuItem): void {
    this.itemDraft = {
      id: item.id,
      categoryId: item.categoryId,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      offerPrice: item.offerPrice,
      offerLabel: item.offerLabel ?? '',
      veg: item.veg === true ? 'veg' : item.veg === false ? 'nonveg' : '',
      available: item.available,
    };
    this.clearPhoto();
    this.itemOpen.set(true);
  }

  editingItem(): MenuItem | undefined {
    return this.items().find((item) => item.id === this.itemDraft.id);
  }

  /** The discount the offer works out to, shown beside the fields. */
  offerPercent(): number | null {
    const { price, offerPrice } = this.itemDraft;
    if (!price || !offerPrice || offerPrice <= 0 || offerPrice >= price) return null;
    return Math.round((1 - offerPrice / price) * 100);
  }

  onPhotoPicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    if (file && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.toast.warning('Use a JPG, PNG or WebP photo');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      this.toast.warning('Photo is too large', '5 MB maximum.');
      (event.target as HTMLInputElement).value = '';
      return;
    }
    this.pendingPhoto = file;
    this.pendingPhotoName.set(file?.name ?? '');
  }

  private clearPhoto(): void {
    this.pendingPhoto = null;
    this.pendingPhotoName.set('');
  }

  saveItem(): void {
    const draft = this.itemDraft;
    if (!draft.categoryId) { this.toast.warning('Choose a category'); return; }
    if (!draft.name.trim()) { this.toast.warning('Name the item'); return; }
    if (!draft.price || draft.price <= 0) { this.toast.warning('Give the item a price'); return; }
    if (draft.offerPrice && draft.offerPrice > 0 && draft.offerPrice >= draft.price) {
      this.toast.warning('Offer price too high', 'The offer price must be lower than the regular price.');
      return;
    }

    const input: ItemInput = {
      categoryId: draft.categoryId,
      name: draft.name.trim(),
      description: draft.description.trim(),
      price: draft.price,
      // A blank offer price is sent as 0, which ends the offer.
      offerPrice: draft.offerPrice && draft.offerPrice > 0 ? draft.offerPrice : 0,
      offerLabel: draft.offerPrice && draft.offerPrice > 0 ? draft.offerLabel.trim() : '',
      veg: draft.veg === 'veg' ? true : draft.veg === 'nonveg' ? false : null,
      available: draft.available,
    };

    this.itemSaving.set(true);
    const request = draft.id == null
      ? this.menu.createItem(input)
      : this.menu.updateItem(draft.id, input);

    request.subscribe({
      next: (saved) => {
        this.upsertItem(saved);
        if (this.pendingPhoto) {
          this.menu.uploadImage(saved.id, this.pendingPhoto).subscribe({
            next: (withPhoto) => this.finishItem(withPhoto, draft.id == null),
            // The dish is saved either way; the photo can be retried.
            error: () => this.finishItem(saved, draft.id == null),
          });
        } else {
          this.finishItem(saved, draft.id == null);
        }
      },
      error: () => this.itemSaving.set(false),
    });
  }

  private finishItem(saved: MenuItem, created: boolean): void {
    this.upsertItem(saved);
    this.itemSaving.set(false);
    this.itemOpen.set(false);
    this.clearPhoto();
    this.toast.success(created ? 'Item added' : 'Item saved');
  }

  removePhoto(): void {
    const item = this.editingItem();
    if (!item) return;
    this.menu.removeImage(item.id).subscribe(() => {
      this.upsertItem({ ...item, imageUrl: null });
      this.toast.success('Photo removed');
    });
  }

  toggleAvailable(item: MenuItem): void {
    this.menu.updateItem(item.id, { available: !item.available }).subscribe((saved) => {
      this.upsertItem(saved);
      this.toast.success(saved.available ? `${saved.name} is back on` : `${saved.name} marked sold out`);
    });
  }

  deleteItem(item: MenuItem): void {
    this.confirm.confirmDelete(`item "${item.name}"`).subscribe((ok) => {
      if (!ok) return;
      this.menu.deleteItem(item.id).subscribe(() => {
        this.items.update((list) => list.filter((i) => i.id !== item.id));
        this.toast.success('Item deleted');
      });
    });
  }

  private upsertItem(saved: MenuItem): void {
    this.items.update((list) => {
      const exists = list.some((i) => i.id === saved.id);
      return exists ? list.map((i) => (i.id === saved.id ? saved : i)) : [...list, saved];
    });
  }

  symbol(): string {
    const currency = this.store()?.currency ?? 'INR';
    return currency === 'INR' ? '₹' : currency + ' ';
  }
}
