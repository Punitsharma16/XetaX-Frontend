import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom, isObservable, of } from 'rxjs';

import { permissionGuard } from './permission.guard';
import { PermissionService } from '../services/permission.service';

/**
 * The sidebar hides what a member may not open, but the address bar does not.
 * Without this guard, typing /app/users as a sales agent opened the Team page
 * and filled it with 403s instead of saying no.
 */
describe('permissionGuard', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  /** Runs the guard for a URL and answers /api/team/me with these permissions. */
  const decide = async (url: string, permissions: string[] | null): Promise<boolean | UrlTree> => {
    const result = TestBed.runInInjectionContext(() =>
      permissionGuard({} as never, { url } as never));
    const request = http.match((r) => r.url.includes('/team/me'))[0];
    if (request) {
      if (permissions) request.flush({ data: { isOwner: false, permissions, name: 'TEST' } });
      else request.flush({ data: null }, { status: 500, statusText: 'Server Error' });
    }
    const stream = isObservable(result) ? result : of(result as boolean | UrlTree);
    return firstValueFrom(stream) as Promise<boolean | UrlTree>;
  };

  const denied = (decision: boolean | UrlTree) =>
    decision instanceof UrlTree && decision.toString() === '/unauthorized';

  it('sends a member without the permission to the access-denied page', async () => {
    expect(denied(await decide('/app/users', ['records.view']))).toBeTrue();
  });

  it('lets a member through to a page their role carries', async () => {
    expect(await decide('/app/contacts', ['contacts.view'])).toBeTrue();
  });

  it('covers the pages under a gated section', async () => {
    expect(denied(await decide('/app/whatsapp/campaigns/new', ['records.view']))).toBeTrue();
  });

  it('leaves ungated pages alone', async () => {
    expect(await decide('/app/profile', ['records.view'])).toBeTrue();
  });

  it('opens the page when the permissions cannot be loaded', async () => {
    expect(await decide('/app/users', null)).toBeTrue();
  });

  it('lets the owner everywhere', async () => {
    TestBed.inject(PermissionService).load();
    http.match((r) => r.url.includes('/team/me'))[0]
      .flush({ data: { isOwner: true, permissions: [], name: 'TEST Owner' } });

    expect(await decide('/app/users', null)).toBeTrue();
  });
});
