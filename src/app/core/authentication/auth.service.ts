import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, map, catchError, of, finalize } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AuthUser,
  AppRole,
  LoginRequest,
  RefreshTokenRequest,
  SessionUser,
  TokenResponse,
} from '../models/auth.model';
import { TokenStorageService } from './token-storage.service';

/** Auth service routes (AuthTokenController @RequestMapping("/auth/v1")). */
const AUTH = {
  login: '/auth/v1/login',
  refresh: '/auth/v1/refresh',
  logout: '/auth/v1/logoutRefreshToken',
  /*
   * Self-service signup — the one user endpoint the gateway leaves open
   * (RouteValidator.OPEN_API_ENDPOINT). POST "/auth/api/v1/users/" is the admin
   * create endpoint and still requires a token.
   */
  register: '/auth/api/v1/users/register',
} as const;

/**
 * Session owner.
 *
 * Exposes the current user as a signal so templates and guards read the same
 * source, and keeps every token side effect (storage, redirect) in one place.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly storage = inject(TokenStorageService);

  private readonly _user = signal<SessionUser | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.isAdmin === true);
  readonly roles = computed(() => this._user()?.roles ?? []);
  readonly initials = computed(() => {
    const name = this._user()?.name?.trim();
    if (!name) return '?';
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  });

  constructor() {
    this.restoreSession();
  }

  // ------------------------------------------------------------------ session

  /**
   * Rehydrate from storage on app boot so a reload keeps the user signed in.
   *
   * An expired access token is NOT a reason to drop the session here: the
   * auth interceptor refreshes it transparently on the first 401, and only a
   * dead refresh token signs the user out. Clearing on expiry made every
   * reload after a short absence look like "session timed out".
   */
  private restoreSession(): void {
    const user = this.storage.user;
    const token = this.storage.accessToken;
    if (user && token) {
      this._user.set(this.toSessionUser(user));
    } else if (user || token) {
      // Half-written session — start clean rather than half-signed-in.
      this.storage.clear();
    }
  }

  /**
   * Flatten AuthUserDto into the shape the UI consumes.
   *
   * `admin`/`enable` are the Jackson-serialised names of the Java fields
   * `isAdmin`/`isEnable`; both spellings are accepted (see auth.model.ts).
   */
  private toSessionUser(dto: AuthUser): SessionUser {
    const roles = (dto.roles ?? [])
      .map((r) => r?.name?.toUpperCase())
      .filter((r): r is string => !!r);

    const isAdmin = dto.admin ?? dto.isAdmin ?? false;

    // An admin flag with no explicit role still needs to satisfy role guards.
    if (isAdmin && !roles.includes(AppRole.Admin)) {
      roles.push(AppRole.Admin);
    }

    return {
      id: dto.id,
      email: dto.email,
      name: dto.name || dto.email,
      image: dto.image ?? null,
      company: dto.company ?? null,
      phone: dto.phone ?? null,
      isAdmin,
      isEnabled: dto.enable ?? dto.isEnable ?? true,
      roles,
    };
  }

  // -------------------------------------------------------------------- login

  /** Spring Security's OAuth2 entry point — the browser is redirected to Google from here. */
  googleLoginUrl(): string {
    return `${environment.authBaseUrl}/oauth2/authorization/google`;
  }

  /**
   * Finish a Google sign-in/sign-up: the backend redirected to /oauth/callback
   * with the same trio /auth/v1/login returns (access + refresh token + user).
   * Google sessions are always remembered — there is no "keep me signed in"
   * checkbox on Google's screen.
   */
  completeExternalLogin(accessToken: string, refreshToken: string, user: AuthUser): SessionUser {
    this.storage.save(accessToken, refreshToken, user, true);
    const session = this.toSessionUser(user);
    this._user.set(session);
    return session;
  }

  login(credentials: LoginRequest, remember: boolean): Observable<SessionUser> {
    return this.http
      .post<TokenResponse>(`${environment.authBaseUrl}${AUTH.login}`, credentials)
      .pipe(
        map((res) => {
          this.storage.save(res.accessToken, res.refreshToken, res.userDto, remember);
          const session = this.toSessionUser(res.userDto);
          this._user.set(session);
          return session;
        }),
      );
  }

  /**
   * Create an account.
   *
   * Both spellings of the boolean flags are sent: the Java fields are
   * `isEnable` / `isAdmin`, which Lombok exposes as `setEnable` / `setAdmin`,
   * so Jackson binds `enable` / `admin`. Unknown properties are ignored by
   * default, making the pair safe to send.
   */
  register(details: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    company?: string;
  }): Observable<AuthUser> {
    const body = {
      name: details.name,
      email: details.email,
      password: details.password,
      phone: details.phone || null,
      company: details.company || null,
      enable: true,
      isEnable: true,
      admin: false,
      isAdmin: false,
    };

    return this.http.post<AuthUser>(`${environment.authBaseUrl}${AUTH.register}`, body);
  }

  /**
   * Rotate tokens. The backend also accepts the refresh token from a cookie or
   * the X-RefreshToken header; the body form is used here because the SPA holds
   * the token itself (the login response does not set the cookie).
   */
  refresh(): Observable<TokenResponse> {
    const refreshToken = this.storage.refreshToken;
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const body: RefreshTokenRequest = { refreshToken };
    return this.http
      .post<TokenResponse>(`${environment.authBaseUrl}${AUTH.refresh}`, body)
      .pipe(
        tap((res) => {
          this.storage.updateTokens(res.accessToken, res.refreshToken);
          if (res.userDto) {
            this.storage.updateUser(res.userDto);
            this._user.set(this.toSessionUser(res.userDto));
          }
        }),
      );
  }

  /** Revoke server-side, then clear locally regardless of the server's answer. */
  logout(redirect = true): void {
    const refreshToken = this.storage.refreshToken;

    this.http
      .post<void>(
        `${environment.authBaseUrl}${AUTH.logout}`,
        {},
        refreshToken ? { headers: { 'X-RefreshToken': refreshToken } } : {},
      )
      .pipe(
        catchError(() => of(null)),
        finalize(() => {
          this.storage.clear();
          this._user.set(null);
          if (redirect) {
            this.router.navigate(['/login']);
          }
        }),
      )
      .subscribe();
  }

  /** Drop the session without calling the server (used on 401). */
  clearSession(): void {
    this.storage.clear();
    this._user.set(null);
  }

  // -------------------------------------------------------------- permissions

  hasRole(role: string): boolean {
    return this.roles().includes(role.toUpperCase());
  }

  hasAnyRole(roles: string[]): boolean {
    if (!roles.length) return true;
    return roles.some((r) => this.hasRole(r));
  }
}
