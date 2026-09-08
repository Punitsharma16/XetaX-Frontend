import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CrmApiService } from '../../core/services/crm-api.service';
import {
  IntegrationRequest,
  IntegrationResponse,
  MappingItemResponse,
  SaveMappingRequest,
} from '../../core/models/crm.model';

/**
 * Integrations API — IntegrationController, @RequestMapping("/api/integrations").
 *
 *   POST/GET/PUT/DELETE  /api/integrations[/{id}]
 *   POST                 /api/integrations/{id}/mapping
 *
 * Inbound payloads are posted by the third party to
 * POST /api/public/integrations/{integrationKey} with an X-API-KEY header
 * (PublicIntegrationController) — that URL is shown to the user, never called
 * by this app.
 */
@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/integrations';

  getAll(): Observable<IntegrationResponse[]> {
    return this.api.get<IntegrationResponse[]>(this.path);
  }

  getById(id: number): Observable<IntegrationResponse> {
    return this.api.get<IntegrationResponse>(`${this.path}/${id}`);
  }

  create(request: IntegrationRequest): Observable<IntegrationResponse> {
    return this.api.post<IntegrationResponse>(this.path, request);
  }

  update(id: number, request: IntegrationRequest): Observable<IntegrationResponse> {
    return this.api.put<IntegrationResponse>(`${this.path}/${id}`, request);
  }

  delete(id: number): Observable<string> {
    return this.api.delete(`${this.path}/${id}`);
  }

  saveMappings(id: number, request: SaveMappingRequest): Observable<string> {
    return this.api.post<string>(`${this.path}/${id}/mapping`, request);
  }

  /** Stored mappings — the source keys the webhook payload must actually use. */
  getMappings(id: number): Observable<MappingItemResponse[]> {
    return this.api.get<MappingItemResponse[]>(`${this.path}/${id}/mapping`);
  }

  /**
   * Public ingest URL for an integration.
   *
   * Prefers the `endpoint` the backend returns; falls back to composing it from
   * the integration key so the panel still shows something useful if the field
   * comes back empty.
   */
  webhookUrl(integration: IntegrationResponse): string {
    if (integration.endpoint?.trim()) {
      return integration.endpoint;
    }
    return `${environment.crmBaseUrl}/api/public/integrations/${integration.integrationKey}`;
  }
}
