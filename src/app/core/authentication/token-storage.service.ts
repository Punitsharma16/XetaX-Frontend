import { Injectable } from '@angular/core';
import { AuthUser } from '../models/auth.model';

const ACCESS_TOKEN = 'xetax.access_token';
const REFRESH_TOKEN = 'xetax.refresh_token';
const USER = 'xetax.user';
const PERSISTENT = 'xetax.persistent';

/**
 * Single owner of auth persistence.
 *
 * Sessions always live in localStorage so a refresh, a new tab, or a browser
 * restart keeps the user signed in. (sessionStorage was tried for unchecked
 * "keep me signed in", but dying with the tab read as "session timed out" —
 * real expiry is the server's job via the refresh-token flow.) Only this
 * service touches Web Storage, so switching stores later is a one-file change.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private get store(): Storage {
    return localStorage;
  }

  isPersistent(): boolean {
    return true;
  }

  save(accessToken: string, refreshToken: string, user: AuthUser, remember: boolean): void {
    this.clear();
    localStorage.setItem(PERSISTENT, String(remember));
    localStorage.setItem(ACCESS_TOKEN, accessToken);
    localStorage.setItem(REFRESH_TOKEN, refreshToken);
    localStorage.setItem(USER, JSON.stringify(user));
  }

  /** Replace tokens after a refresh without disturbing the stored user. */
  updateTokens(accessToken: string, refreshToken: string): void {
    this.store.setItem(ACCESS_TOKEN, accessToken);
    this.store.setItem(REFRESH_TOKEN, refreshToken);
  }

  updateUser(user: AuthUser): void {
    this.store.setItem(USER, JSON.stringify(user));
  }

  get accessToken(): string | null {
    return this.store.getItem(ACCESS_TOKEN);
  }

  get refreshToken(): string | null {
    return this.store.getItem(REFRESH_TOKEN);
  }

  get user(): AuthUser | null {
    const raw = this.store.getItem(USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  clear(): void {
    [localStorage, sessionStorage].forEach((s) => {
      s.removeItem(ACCESS_TOKEN);
      s.removeItem(REFRESH_TOKEN);
      s.removeItem(USER);
    });
    localStorage.removeItem(PERSISTENT);
  }

  /**
   * Expiry read straight from the JWT `exp` claim, so the UI never has to
   * trust a locally-computed clock offset. Returns null for a malformed token.
   */
  accessTokenExpiry(): Date | null {
    const token = this.accessToken;
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? ''));
      return payload?.exp ? new Date(payload.exp * 1000) : null;
    } catch {
      return null;
    }
  }

  isAccessTokenExpired(): boolean {
    const expiry = this.accessTokenExpiry();
    return expiry ? expiry.getTime() <= Date.now() : false;
  }
}
