import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';

import { AuthService } from '../authentication/auth.service';

/**
 * Blocks the authenticated shell for signed-out visitors and remembers where
 * they were headed so login can send them back.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Remember a deep link (a record, an invoice…) — but not the default landing
  // page, so a plain visit shows a clean /login.
  const isDefault = !state.url || state.url === '/' || /^\/app(\/dashboard)?\/?$/.test(state.url);
  return router.createUrlTree(['/login'], {
    queryParams: isDefault ? {} : { returnUrl: state.url },
  });
};

/** CanMatch variant — stops lazy chunks downloading for signed-out visitors. */
export const authMatchGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};
