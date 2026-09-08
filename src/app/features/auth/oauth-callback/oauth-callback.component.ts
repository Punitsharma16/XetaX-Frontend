import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/authentication/auth.service';
import { AuthUser } from '../../../core/models/auth.model';

/**
 * Landing spot after Google sign-in. The backend redirects here with
 * `#access_token=…&refresh_token=…&user=<base64url json>` — read once, stash the
 * session, and move on. Nothing is rendered beyond a spinner; the fragment is
 * cleared so the tokens never linger in history.
 */
@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 100vh; gap: 12px">
      <span class="spinner-border text-primary" role="status" aria-hidden="true"></span>
      <span class="text-muted" style="font-size: 0.875rem">Signing you in…</span>
    </div>
  `,
})
export class OAuthCallbackComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const access = params.get('access_token');
    const refresh = params.get('refresh_token');
    const userB64 = params.get('user');

    // Drop the fragment immediately — a reload or back-button must not replay tokens.
    history.replaceState(null, '', window.location.pathname);

    let user: AuthUser | null = null;
    try {
      if (userB64) {
        const json = atob(userB64.replace(/-/g, '+').replace(/_/g, '/'));
        user = JSON.parse(decodeURIComponent(escape(json))) as AuthUser;
      }
    } catch {
      user = null;
    }

    if (access && refresh && user) {
      this.auth.completeExternalLogin(access, refresh, user);
      this.router.navigateByUrl('/app/dashboard', { replaceUrl: true });
    } else {
      this.router.navigate(['/login'], { queryParams: { oauth: 'failed' }, replaceUrl: true });
    }
  }
}
