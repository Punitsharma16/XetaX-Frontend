import { Injectable, inject, signal } from '@angular/core';

import { CrmApiService } from './crm-api.service';

/** Pack-specific pages this workspace has, keyed by the pack that brings them. */
export interface WorkspaceModules {
  /** Restaurant pack — the online menu. */
  menu: boolean;
  /** Hair Salon pack — the booking diary. */
  booking: boolean;
}

/**
 * Which pack pages belong in this workspace's sidebar.
 *
 * <p>A pack brings a page with it — the Restaurant pack the online menu, the
 * Hair Salon pack the booking diary — and that page means nothing to a
 * workspace that never installed it. Unlike a permission, a missing answer
 * hides the page rather than showing it: a law firm should never see a menu,
 * and the page is one install away for anyone who does want it.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceModulesService {
  private readonly api = inject(CrmApiService);

  private readonly modules = signal<WorkspaceModules | null>(null);
  /** Re-run computed signals once the answer lands. */
  readonly loaded = signal(false);

  load(): void {
    this.api.get<WorkspaceModules>('/api/workspace/modules', undefined, { quiet: true }).subscribe({
      next: (modules) => {
        this.modules.set(modules);
        this.loaded.set(true);
      },
      error: () => {
        this.modules.set(null);
        this.loaded.set(true);
      },
    });
  }

  has(key: keyof WorkspaceModules): boolean {
    return this.modules()?.[key] === true;
  }
}
