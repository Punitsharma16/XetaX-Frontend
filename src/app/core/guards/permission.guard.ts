import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { NAVIGATION } from '../../layout/navigation';
import { PermissionService } from '../services/permission.service';

/** The permission the sidebar asks for on the page this URL belongs to. */
function requiredFor(url: string): string | null {
  const path = url.split(/[?#]/)[0];
  let match: { route: string; perm: string } | null = null;
  for (const section of NAVIGATION) {
    for (const item of section.items) {
      if (!item.perm) continue;
      if (path !== item.route && !path.startsWith(item.route + '/')) continue;
      if (!match || item.route.length > match.route.length) match = { route: item.route, perm: item.perm };
    }
  }
  return match?.perm ?? null;
}

/**
 * Keeps a member out of a page their role does not carry. The sidebar already
 * hides those links, but the address bar does not: typing the URL used to open
 * the page and fill it with failed requests instead of saying no.
 *
 * It waits for /api/team/me, because a decision taken before the permissions
 * arrive would bounce people out of pages they are allowed to see. If that
 * call fails there is nothing to judge on, and the page opens as before.
 */
export const permissionGuard: CanActivateChildFn = (_route, state) => {
  const required = requiredFor(state.url);
  if (!required) return true;

  const perms = inject(PermissionService);
  const router = inject(Router);
  return perms.ready().pipe(
    map(() =>
      required.split('|').some((key) => perms.has(key)) ? true : router.createUrlTree(['/unauthorized'])),
  );
};
