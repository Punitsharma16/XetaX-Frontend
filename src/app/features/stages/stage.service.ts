import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { StageRequest, StageResponse } from '../../core/models/crm.model';

/**
 * Stages API — StageController, @RequestMapping("/stage").
 *
 *   POST   /stage/forms/{formId}/stages   create
 *   GET    /stage/forms/{formId}/stages   list
 *   PUT    /stage/stages/{id}             update
 *   DELETE /stage/stages/{id}             delete
 */
@Injectable({ providedIn: 'root' })
export class StageService {
  private readonly api = inject(CrmApiService);

  getByForm(formId: number): Observable<StageResponse[]> {
    return this.api
      .get<StageResponse[]>(`/stage/forms/${formId}/stages`)
      .pipe(map((stages) => [...(stages ?? [])].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))));
  }

  create(formId: number, request: StageRequest): Observable<StageResponse> {
    return this.api.post<StageResponse>(`/stage/forms/${formId}/stages`, request);
  }

  update(id: number, request: StageRequest): Observable<StageResponse> {
    return this.api.put<StageResponse>(`/stage/stages/${id}`, request);
  }

  delete(id: number): Observable<string> {
    return this.api.delete(`/stage/stages/${id}`);
  }

  /** Stage code derived from a name — uppercase snake, matching backend style. */
  static toCode(name: string): string {
    return name
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }
}
