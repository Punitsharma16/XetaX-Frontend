import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthUser, AuthUserRequest } from '../../core/models/auth.model';

/**
 * Users API — AuthUserController, @RequestMapping("/auth/api/v1/users").
 *
 *   POST   /auth/api/v1/users/                    create
 *   GET    /auth/api/v1/users/getAllUsers         list
 *   GET    /auth/api/v1/users/getUserById/{id}    read
 *   GET    /auth/api/v1/users/getUserByEmail/{e}  read by email
 *   PUT    /auth/api/v1/users/{id}                update
 *   DELETE /auth/api/v1/users/{id}                delete
 *
 * The auth service returns DTOs directly — no ApiResponse envelope, which is
 * why this service uses HttpClient rather than CrmApiService.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.authBaseUrl}/auth/api/v1/users`;

  getAll(): Observable<AuthUser[]> {
    return this.http.get<AuthUser[]>(`${this.base}/getAllUsers`);
  }

  getById(id: string): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.base}/getUserById/${id}`);
  }

  getByEmail(email: string): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.base}/getUserByEmail/${encodeURIComponent(email)}`);
  }

  /** Trailing slash is required — the controller maps POST to "/". */
  create(user: AuthUserRequest): Observable<AuthUser> {
    return this.http.post<AuthUser>(`${this.base}/`, user);
  }

  update(id: string, user: AuthUserRequest): Observable<AuthUser> {
    return this.http.put<AuthUser>(`${this.base}/${id}`, user);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
