import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

import { AuthService } from '../authentication/auth.service';
import { TokenStorageService } from '../authentication/token-storage.service';
import { ToastService } from '../services/toast.service';

/** Endpoints the gateway serves without a token (RouteValidator.OPEN_API_ENDPOINT). */
const PUBLIC_PATHS = ['/auth/v1/login', '/auth/v1/refresh', '/auth/v1/register'];

const isPublic = (req: HttpRequest<unknown>): boolean =>
  PUBLIC_PATHS.some((p) => req.url.includes(p));

/**
 * Refresh coordination.
 *
 * While one refresh is in flight every other 401 parks on `refreshed$` instead
 * of firing its own refresh — otherwise a page issuing five parallel calls
 * would rotate the refresh token five times and invalidate its own session.
 */
let refreshing = false;
const refreshed$ = new BehaviorSubject<string | null>(null);

/** Attaches the access token and transparently recovers from an expired one. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(TokenStorageService);
  const auth = inject(AuthService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const withToken = (request: HttpRequest<unknown>, token: string | null) =>
    token
      ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : request;

  if (isPublic(req)) {
    return next(req);
  }

  return next(withToken(req, storage.accessToken)).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }

      // No refresh token to spend — the session is simply over.
      if (!storage.refreshToken) {
        endSession(auth, router, toast);
        return throwError(() => error);
      }

      if (refreshing) {
        return refreshed$.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((token) => next(withToken(req, token))),
        );
      }

      refreshing = true;
      refreshed$.next(null);

      return auth.refresh().pipe(
        switchMap((res) => {
          refreshing = false;
          refreshed$.next(res.accessToken);
          return next(withToken(req, res.accessToken));
        }),
        catchError((refreshError: unknown) => {
          refreshing = false;
          refreshed$.next(null);
          endSession(auth, router, toast);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

function endSession(auth: AuthService, router: Router, toast: ToastService): void {
  auth.clearSession();
  toast.warning('Session expired', 'Please sign in again to continue.');
  router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
}
