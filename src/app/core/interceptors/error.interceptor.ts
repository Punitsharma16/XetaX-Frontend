import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ToastService } from '../services/toast.service';

/**
 * Turns transport failures into one readable toast.
 *
 * 401 is deliberately left alone — authInterceptor owns the refresh/redirect
 * flow and reporting it here would double up on the message.
 */
/**
 * Set on requests whose failure is an expected state the page handles itself
 * (e.g. "WhatsApp not connected yet" probes) — no toast for those.
 */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status !== 401 && !req.context.get(SKIP_ERROR_TOAST)) {
        toast.error(titleFor(error), messageFor(error));
      }
      return throwError(() => error);
    }),
  );
};

function titleFor(error: HttpErrorResponse): string {
  switch (error.status) {
    case 0:
      return 'Cannot reach the server';
    case 400:
      return 'Invalid request';
    case 403:
      return 'Not allowed';
    case 404:
      return 'Not found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation failed';
    case 500:
      return 'Server error';
    default:
      return `Request failed (${error.status})`;
  }
}

/**
 * Both backends carry the human-readable text in `message`
 * (ApiResponse for CRM, ErrorResponse for the gateway); Spring's default body
 * uses `error`. Bean-validation replies add a field-error map.
 */
function messageFor(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'The API gateway is not responding. Check that it is running and reachable.';
  }

  const body = error.error;

  if (typeof body === 'string' && body.trim()) {
    return body;
  }

  if (body && typeof body === 'object') {
    const fieldErrors = (body as Record<string, unknown>)['errors'];
    if (fieldErrors && typeof fieldErrors === 'object') {
      const first = Object.values(fieldErrors as Record<string, string>)[0];
      if (first) return String(first);
    }

    for (const key of ['message', 'error', 'detail', 'returnMessage']) {
      const value = (body as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }

  return error.message || 'Something went wrong. Please try again.';
}
