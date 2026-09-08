import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../authentication/auth.service';

/**
 * Permission guard driven by route data:
 *
 *   { path: 'automation', canActivate: [roleGuard], data: { roles: ['ADMIN'] } }
 *
 * A route without `roles` is open to any signed-in user. Admins pass every
 * check — the backend treats `isAdmin` as a superset of the named roles.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const required = (route.data?.['roles'] as string[] | undefined) ?? [];

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (!required.length || auth.isAdmin() || auth.hasAnyRole(required)) {
    return true;
  }

  return router.createUrlTree(['/unauthorized']);
};
