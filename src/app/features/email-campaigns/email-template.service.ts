import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface EmailTemplateRequest {
  name: string;
  subject: string;
  body: string;
}

/**
 * /api/email/templates — saved subject + body pairs the campaign wizard can
 * start from.
 *
 * A template only ever pre-fills the wizard: the campaign stores its own copy
 * of the text, so editing a template later never rewrites a campaign that has
 * already gone out.
 */
@Injectable({ providedIn: 'root' })
export class EmailTemplateService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/email/templates';

  list(): Observable<EmailTemplate[]> {
    return this.api.get<EmailTemplate[]>(this.path);
  }

  get(id: number): Observable<EmailTemplate> {
    return this.api.get<EmailTemplate>(`${this.path}/${id}`);
  }

  create(request: EmailTemplateRequest): Observable<EmailTemplate> {
    return this.api.post<EmailTemplate>(this.path, request);
  }

  update(id: number, request: EmailTemplateRequest): Observable<EmailTemplate> {
    return this.api.put<EmailTemplate>(`${this.path}/${id}`, request);
  }

  delete(id: number): Observable<string> {
    return this.api.delete(`${this.path}/${id}`);
  }
}
