import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/authentication/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoginComponent } from './login.component';

/**
 * Signing in used to land back on /login.
 *
 * <p>The interceptor sends an expired session to /login?returnUrl=…, and when
 * the session expired with the login page already open, that returnUrl was
 * /login itself. Navigating to the page you are already on is a no-op, so the
 * toast appeared and nothing moved until the tab was reloaded. An auth page is
 * never a destination — that is what these pin.
 */
describe('LoginComponent — where signing in takes you', () => {

  let queryParams: Record<string, string>;

  /** The private rule under test; reached the way a spec may. */
  const destination = (): string => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    return (component as unknown as { destinationAfterLogin(): string }).destinationAfterLogin();
  };

  beforeEach(async () => {
    queryParams = {};
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: (key: string) => queryParams[key] ?? null } },
            queryParams: of({}),
          },
        },
        {
          provide: AuthService,
          useValue: {
            login: () => of({ name: 'Test User' }),
            // The page builds its Google button from this at construction.
            googleLoginUrl: () => 'https://api.example.com/oauth2/authorization/google',
          },
        },
        { provide: ToastService, useValue: { success: () => {}, error: () => {}, info: () => {} } },
      ],
    }).compileComponents();
  });

  it('goes to the dashboard when there is nowhere to return to', () => {
    expect(destination()).toBe('/app/dashboard');
  });

  it('returns to the page the user was sent away from', () => {
    queryParams['returnUrl'] = '/app/records/leads';
    expect(destination()).toBe('/app/records/leads');
  });

  it('keeps the query string on the way back', () => {
    queryParams['returnUrl'] = '/app/records/leads?page=2';
    expect(destination()).toBe('/app/records/leads?page=2');
  });

  it('never returns to the login page itself', () => {
    queryParams['returnUrl'] = '/login';
    expect(destination()).toBe('/app/dashboard');
  });

  it('never returns to the login page with its own returnUrl attached', () => {
    queryParams['returnUrl'] = '/login?returnUrl=/app/dashboard';
    expect(destination()).toBe('/app/dashboard');
  });

  it('ignores a trailing slash on an auth page', () => {
    queryParams['returnUrl'] = '/login/';
    expect(destination()).toBe('/app/dashboard');
  });

  it('never returns to the other auth pages either', () => {
    for (const page of ['/register', '/verify-email', '/forgot-password']) {
      queryParams['returnUrl'] = page;
      expect(destination()).withContext(page).toBe('/app/dashboard');
    }
  });

  it('refuses a returnUrl pointing at another site', () => {
    queryParams['returnUrl'] = 'https://evil.example.com/steal';
    expect(destination()).toBe('/app/dashboard');
  });

  it('refuses a returnUrl that names another host', () => {
    for (const url of ['//evil.example.com', '/\\evil.example.com']) {
      queryParams['returnUrl'] = url;
      expect(destination()).withContext(url).toBe('/app/dashboard');
    }
  });
});
