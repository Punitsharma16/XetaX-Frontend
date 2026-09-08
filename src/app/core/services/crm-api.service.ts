import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { SKIP_ERROR_TOAST } from '../interceptors/error.interceptor';
import { ApiResponse } from '../models/api.model';

/**
 * Thin typed transport for the CRM service.
 *
 * Every CRM endpoint replies with `ApiResponse<T>`; unwrapping it here means
 * feature services deal in domain types only and no component ever touches
 * `.data`. Paths are relative to `environment.crmBaseUrl`.
 */
@Injectable({ providedIn: 'root' })
export class CrmApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.crmBaseUrl;

  private url(path: string): string {
    return `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  /** Drops null/undefined so optional query params never serialise as "null". */
  private toParams(query?: Record<string, string | number | boolean | undefined | null>): HttpParams {
    let params = new HttpParams();
    if (!query) return params;

    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  get<T>(
    path: string,
    query?: Record<string, string | number | boolean | undefined | null>,
    opts?: { quiet?: boolean },
  ): Observable<T> {
    const context = opts?.quiet
      ? new HttpContext().set(SKIP_ERROR_TOAST, true)
      : undefined;
    return this.http
      .get<ApiResponse<T>>(this.url(path), { params: this.toParams(query), context })
      .pipe(map((res) => res.data));
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<ApiResponse<T>>(this.url(path), body).pipe(map((res) => res.data));
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<ApiResponse<T>>(this.url(path), body).pipe(map((res) => res.data));
  }

  /** Delete endpoints return `ApiResponse<Void>`; only the message matters. */
  delete(path: string): Observable<string> {
    return this.http.delete<ApiResponse<void>>(this.url(path)).pipe(map((res) => res.message));
  }
}
