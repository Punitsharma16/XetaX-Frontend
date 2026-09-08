import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import {
  AutomationActionRequest,
  AutomationActionResponse,
  AutomationConditionRequest,
  AutomationConditionResponse,
  AutomationRequest,
  AutomationResponse,
} from '../../core/models/crm.model';

/**
 * Automations API — AutomationController + its action/condition controllers.
 *
 *   /api/automations                      CRUD
 *   /api/automations/{id}/conditions      GET list, POST replaces the whole set
 *   /api/automations/{id}/actions         GET list, POST replaces the whole set
 *
 * Both POSTs take an array and save it as the complete set, so the editor
 * always sends every row rather than diffing.
 */
@Injectable({ providedIn: 'root' })
export class AutomationService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/automations';

  getAll(): Observable<AutomationResponse[]> {
    return this.api.get<AutomationResponse[]>(this.path);
  }

  getById(id: number): Observable<AutomationResponse> {
    return this.api.get<AutomationResponse>(`${this.path}/${id}`);
  }

  create(request: AutomationRequest): Observable<AutomationResponse> {
    return this.api.post<AutomationResponse>(this.path, request);
  }

  update(id: number, request: AutomationRequest): Observable<AutomationResponse> {
    return this.api.put<AutomationResponse>(`${this.path}/${id}`, request);
  }

  delete(id: number): Observable<string> {
    return this.api.delete(`${this.path}/${id}`);
  }

  getConditions(automationId: number): Observable<AutomationConditionResponse[]> {
    return this.api.get<AutomationConditionResponse[]>(`${this.path}/${automationId}/conditions`);
  }

  saveConditions(
    automationId: number,
    conditions: AutomationConditionRequest[],
  ): Observable<AutomationConditionResponse[]> {
    return this.api.post<AutomationConditionResponse[]>(
      `${this.path}/${automationId}/conditions`,
      conditions,
    );
  }

  getActions(automationId: number): Observable<AutomationActionResponse[]> {
    return this.api.get<AutomationActionResponse[]>(`${this.path}/${automationId}/actions`);
  }

  saveActions(
    automationId: number,
    actions: AutomationActionRequest[],
  ): Observable<AutomationActionResponse[]> {
    return this.api.post<AutomationActionResponse[]>(
      `${this.path}/${automationId}/actions`,
      actions,
    );
  }
}
