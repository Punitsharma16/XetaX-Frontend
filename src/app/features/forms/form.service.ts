import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { FormRequest, FormResponse } from '../../core/models/crm.model';

/**
 * Forms API — FormController, @RequestMapping("/api/forms").
 *
 *   POST   /api/forms        create
 *   GET    /api/forms        list
 *   GET    /api/forms/{id}   read
 *   PUT    /api/forms/{id}   update
 *   DELETE /api/forms/{id}   delete
 */
@Injectable({ providedIn: 'root' })
export class FormService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/forms';

  getAll(): Observable<FormResponse[]> {
    return this.api.get<FormResponse[]>(this.path);
  }

  getById(id: number): Observable<FormResponse> {
    return this.api.get<FormResponse>(`${this.path}/${id}`);
  }

  create(request: FormRequest): Observable<FormResponse> {
    return this.api.post<FormResponse>(this.path, request);
  }

  update(id: number, request: FormRequest): Observable<FormResponse> {
    return this.api.put<FormResponse>(`${this.path}/${id}`, request);
  }

  delete(id: number): Observable<string> {
    return this.api.delete(`${this.path}/${id}`);
  }

  /** URL-safe slug derived from a form name, matching the backend's expectation. */
  static toSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
