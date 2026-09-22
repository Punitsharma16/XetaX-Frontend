import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, ReplaySubject, of, take } from 'rxjs';

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

  private readonly settled = new ReplaySubject<void>(1);
  private inFlight = false;

  load(): void {
    if (this.inFlight) return;
    this.inFlight = true;
    this.api.get<MeContext>('/api/team/me', undefined, { quiet: true }).subscribe({
      next: (ctx) => {
        this.inFlight = false;
        this.context.set(ctx);
        this.settled.next();
      },
      error: () => {
        this.inFlight = false;
        this.context.set(null);
        this.settled.next();
      },
    });
  }

  /** Emits once /api/team/me has answered, so a guard can decide on facts. */
  ready(): Observable<unknown> {
    if (this.context()) return of(null);
    this.load();
    return this.settled.pipe(take(1));
  }

  /** Unknown/unloaded context => allow (owner-like) so nothing flashes hidden. */
  has(key: string): boolean {
    const ctx = this.context();
    if (!ctx) return true;
    return ctx.isOwner || ctx.permissions.includes(key);
  }
}
