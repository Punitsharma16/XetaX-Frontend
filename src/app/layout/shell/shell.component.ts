import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../../core/authentication/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { PermissionService } from '../../core/services/permission.service';
import { ThemeService } from '../../core/services/theme.service';
import { FormResponse } from '../../core/models/crm.model';
import { FormService } from '../../features/forms/form.service';
import { NAVIGATION, NavItem, NavSection } from '../navigation';
import { DeskWidgetComponent } from '../../features/desk/desk-widget.component';

const SIDEBAR_KEY = 'xetax.sidebar.collapsed';

/**
 * Authenticated shell: sidebar + topbar + routed content.
 *
 * The sidebar is filtered by the signed-in user's roles, so a route the user
 * cannot open is never advertised (roleGuard still enforces it server-side of
 * the router, for deep links).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DeskWidgetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  readonly perms = inject(PermissionService);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly formService = inject(FormService);
  readonly notifications = inject(NotificationService);

  readonly user = this.auth.user;
  readonly initials = this.auth.initials;
  readonly theme = this.themeService.theme;

  readonly collapsed = signal(localStorage.getItem(SIDEBAR_KEY) === 'true');
  readonly mobileOpen = signal(false);

  // ------------------------------------------------ Records submenu (forms)

  readonly recordsOpen = signal(false);
  readonly recordForms = signal<FormResponse[]>([]);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** True while any records page (picker or a form's records) is open. */
  readonly onRecords = computed(() => this.currentUrl().startsWith('/app/records'));

  toggleRecords(): void {
    const next = !this.recordsOpen();
    this.recordsOpen.set(next);
    if (next) this.loadRecordForms();
  }

  /** Fresh list on every expand, so a newly created form appears immediately. */
  private loadRecordForms(): void {
    this.formService.getAll().subscribe({
      next: (forms) => this.recordForms.set(forms ?? []),
      error: () => this.recordForms.set([]),
    });
  }

  /** Sections with no visible item are dropped entirely. */
  readonly sections = computed<NavSection[]>(() => {
    this.user(); // re-evaluate when the session changes
    this.perms.loaded(); // re-evaluate when permissions arrive
    return NAVIGATION.map((section) => ({
      ...section,
      items: section.items.filter((item) => this.canSee(item)),
    })).filter((section) => section.items.length > 0);
  });

  /** Breadcrumb trail derived from the active URL. */
  readonly breadcrumbs = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => this.toBreadcrumbs(e.urlAfterRedirects)),
      startWith(this.toBreadcrumbs(this.router.url)),
    ),
    { initialValue: [] as string[] },
  );

  constructor() {
    this.notifications.start();
    this.perms.load();
    // Auto-expand the Records submenu whenever a records page is open.
    effect(() => {
      if (this.onRecords() && !this.recordsOpen()) {
        this.recordsOpen.set(true);
        this.loadRecordForms();
      }
    });
  }

  private canSee(item: NavItem): boolean {
    // perm supports alternatives: 'a|b' => visible when EITHER is granted.
    if (item.perm && !item.perm.split('|').some((key) => this.perms.has(key))) return false;
    if (!item.roles?.length) return true;
    return this.auth.isAdmin() || this.auth.hasAnyRole(item.roles);
  }

  private toBreadcrumbs(url: string): string[] {
    return url
      .split('?')[0]
      .split('/')
      .filter((part) => part && part !== 'app')
      .map((part) =>
        decodeURIComponent(part)
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      );
  }

  toggleSidebar(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  }

  openNotification(n: { id: number; readAt: string | null; link: string | null }): void {
    if (!n.readAt) this.notifications.markRead(n.id);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  toggleMobileNav(): void {
    this.mobileOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileOpen.set(false);
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  logout(): void {
    this.auth.logout();
  }
}
