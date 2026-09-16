import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface MenuStore {
  id: number;
  formId: number | null;
  enabled: boolean;
  title: string | null;
  tagline: string | null;
  currency: string | null;
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
  publicKey: string;
  /** The page customers open. */
  menuUrl: string;
  /** The QR image; add ?download=true, ?table=, ?size=. */
  qrUrl: string;
}

export interface MenuOrderForm {
  id: number;
  name: string;
  slug: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
}

export interface MenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  price: number;
  offerPrice: number | null;
  offerLabel: string | null;
  effectivePrice: number;
  veg: boolean | null;
  available: boolean;
  sortOrder: number;
  imageUrl: string | null;
}

export interface MenuOverview {
  store: MenuStore;
  orderForms: MenuOrderForm[];
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface StoreUpdate {
  formId?: number | null;
  enabled?: boolean;
  title?: string;
  tagline?: string;
  dineIn?: boolean;
  takeaway?: boolean;
  delivery?: boolean;
}

export interface CategoryInput {
  name?: string;
  description?: string;
  sortOrder?: number;
  active?: boolean;
}

export interface ItemInput {
  categoryId?: number;
  name?: string;
  description?: string;
  price?: number;
  /** 0 or blank clears the offer. */
  offerPrice?: number | null;
  offerLabel?: string;
  veg?: boolean | null;
  available?: boolean;
  sortOrder?: number;
}

/**
 * The owner's public menu — its catalogue, offers and share settings. None of
 * this is a CRM record; only the orders customers place become records.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/menu';

  overview(): Observable<MenuOverview> {
    return this.api.get<MenuOverview>(this.path);
  }

  updateStore(update: StoreUpdate): Observable<{ store: MenuStore }> {
    return this.api.put<{ store: MenuStore }>(`${this.path}/store`, update);
  }

  regenerateKey(): Observable<{ store: MenuStore }> {
    return this.api.post<{ store: MenuStore }>(`${this.path}/store/regenerate-key`, {});
  }

  createCategory(input: CategoryInput): Observable<MenuCategory> {
    return this.api.post<MenuCategory>(`${this.path}/categories`, input);
  }

  updateCategory(id: number, input: CategoryInput): Observable<MenuCategory> {
    return this.api.put<MenuCategory>(`${this.path}/categories/${id}`, input);
  }

  deleteCategory(id: number): Observable<string> {
    return this.api.delete(`${this.path}/categories/${id}`);
  }

  createItem(input: ItemInput): Observable<MenuItem> {
    return this.api.post<MenuItem>(`${this.path}/items`, input);
  }

  updateItem(id: number, input: ItemInput): Observable<MenuItem> {
    return this.api.put<MenuItem>(`${this.path}/items/${id}`, input);
  }

  deleteItem(id: number): Observable<string> {
    return this.api.delete(`${this.path}/items/${id}`);
  }

  uploadImage(id: number, file: File): Observable<MenuItem> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<MenuItem>(`${this.path}/items/${id}/image`, form);
  }

  removeImage(id: number): Observable<string> {
    return this.api.delete(`${this.path}/items/${id}/image`);
  }
}
