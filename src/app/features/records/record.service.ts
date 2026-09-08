import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse, Page } from '../../core/models/api.model';
import { CrmApiService } from '../../core/services/crm-api.service';
import { RecordRequest, RecordResponse, RecordSearchRequest } from '../../core/models/crm.model';

/** Mirror of BulkUploadResult on the backend. */
export interface BulkUploadResult {
  totalRows: number;
  successCount: number;
  failedCount: number;
  errors: { row: number; message: string }[];
}

/**
 * Records API — RecordController, @RequestMapping("api/record").
 *
 *   POST   /api/record/{slug}          create
 *   GET    /api/record/{slug}/all      paged list
 *   PUT    /api/record/{slug}/update   update
 *   DELETE /api/record/{id}/delete     delete
 *   POST   /api/record/{slug}/search   filtered + paged search
 *
 * Records are addressed by the form's *slug*, not its id — the slug is the
 * public handle of a form's collection.
 */
@Injectable({ providedIn: 'root' })
export class RecordService {
  private readonly api = inject(CrmApiService);
  private readonly http = inject(HttpClient);
  private readonly path = '/api/record';

  getAll(
    slug: string,
    page = 0,
    size = 20,
    sort = 'createdAt',
    direction: 'ASC' | 'DESC' = 'DESC',
  ): Observable<Page<RecordResponse>> {
    return this.api.get<Page<RecordResponse>>(`${this.path}/${slug}/all`, {
      page,
      size,
      sort,
      direction,
    });
  }

  /** CSV bulk import — per-row results with row numbers for failures. */
  bulkUpload(slug: string, file: File): Observable<BulkUploadResult> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<ApiResponse<BulkUploadResult>>(`${environment.crmBaseUrl}${this.path}/${slug}/bulk-upload`, body)
      .pipe(map((res) => res.data));
  }

  search(slug: string, request: RecordSearchRequest): Observable<Page<RecordResponse>> {
    return this.api.post<Page<RecordResponse>>(`${this.path}/${slug}/search`, request);
  }

  /** Single record by its Mongo id — backs the record detail page on refresh. */
  getById(id: string): Observable<RecordResponse> {
    return this.api.get<RecordResponse>(`${this.path}/${id}`);
  }

  create(slug: string, request: RecordRequest): Observable<RecordResponse> {
    return this.api.post<RecordResponse>(`${this.path}/${slug}`, request);
  }

  /**
   * Update sends the record id inside `data` — RecordRequest carries only a
   * data map, so the identifier has to travel with it.
   */
  update(slug: string, id: string, data: Record<string, unknown>): Observable<RecordResponse> {
    const body: RecordRequest = { data: { ...data } };
    return this.api.put<RecordResponse>(`${this.path}/${id}/update`, body);
  }

  /**
   * Moves a record to another stage.
   *
   * Separate from update(): that endpoint rewrites the data map and leaves the
   * stage alone. This one also fires STAGE_CHANGED automations.
   */
  changeStage(id: string, stageId: number): Observable<RecordResponse> {
    return this.api.put<RecordResponse>(`${this.path}/${id}/stage/${stageId}`, {});
  }

  delete(id: string): Observable<string> {
    return this.http
      .delete<ApiResponse<void>>(`${environment.crmBaseUrl}${this.path}/${id}/delete`)
      .pipe(map((res) => res.message));
  }

  /** Bulk assign records to a team member (records.transfer permission). */
  transfer(recordIds: string[], toUserId: string) {
    return this.api.post<{ moved: number }>('/api/record/transfer', { recordIds, toUserId });
  }

  /** CSV of everything the caller can see on this form — authed blob download. */
  exportCsv(slug: string): Observable<Blob> {
    return this.http.get(`${environment.crmBaseUrl}${this.path}/${slug}/export`, {
      responseType: 'blob',
    });
  }

  /** Existing records already holding this field value (duplicate warning). */
  duplicateCheck(
    slug: string,
    field: string,
    value: string,
  ): Observable<{ id: string; title: string; createdAt: string | null }[]> {
    return this.api.get(`${this.path}/${slug}/duplicate-check`, { field, value }, { quiet: true });
  }

  /** The record's timeline — who did what, newest first. */
  activity(id: string): Observable<RecordActivityEntry[]> {
    return this.api.get<RecordActivityEntry[]>(`${this.path}/${id}/activity`, undefined, {
      quiet: true,
    });
  }
}

export interface RecordActivityEntry {
  id: number;
  actorName: string | null;
  type: string;
  detail: string | null;
  createdAt: string;
}
