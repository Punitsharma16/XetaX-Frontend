import { Injectable, computed, inject, signal } from '@angular/core';

import { CrmApiService } from './crm-api.service';

export interface MeContext {
  userId: string;
  name: string;
  isOwner: boolean;
  role: string;
  permissions: string[];
  company?: string | null;
}

/**
 * Loads the signed-in user's role + permission set once per session and
 * answers `has('records.edit')` style questions for nav/buttons. UI hiding
 * is cosmetic — the backend enforces the same keys on every endpoint and
 * AI tool, so a hidden button bypass still gets a 403.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly api = inject(CrmApiService);

  private readonly context = signal<MeContext | null>(null);
  readonly loaded = computed(() => this.context() !== null);
  readonly isOwner = computed(() => this.context()?.isOwner ?? false);
  readonly role = computed(() => this.context()?.role ?? '');
  readonly userId = computed(() => this.context()?.userId ?? '');
  readonly company = computed(() => this.context()?.company ?? this.context()?.name ?? '');

  load(): void {
    this.api.get<MeContext>('/api/team/me', undefined, { quiet: true }).subscribe({
      next: (ctx) => this.context.set(ctx),
      error: () => this.context.set(null),
    });
  }

  /** Unknown/unloaded context => allow (owner-like) so nothing flashes hidden. */
  has(key: string): boolean {
    const ctx = this.context();
    if (!ctx) return true;
    return ctx.isOwner || ctx.permissions.includes(key);
  }
}
