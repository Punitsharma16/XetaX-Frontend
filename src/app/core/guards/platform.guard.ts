import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../authentication/auth.service';

/**
 * The platform back office belongs to the XetaX team. The sidebar already
 * hides the entry for everyone else; this stops a typed-in /app/platform from
 * opening a page whose every call the API refuses (three 403s and an error
 * banner) — a customer simply lands back on their dashboard.
 */
export const platformGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isPlatformAdmin() ? true : router.createUrlTree(['/app/dashboard']);
};
