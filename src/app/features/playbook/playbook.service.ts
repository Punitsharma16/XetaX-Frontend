import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface PlaybookCondition {
  fieldKey: string;
  op: string;
  value?: string | null;
}

export interface PlaybookRule {
  id?: string | null;
  name: string;
  trigger: string;
  afterMinutes?: number | null;
  stageIds: number[];
  interest?: string | null;
  maxRepeats?: number | null;
  repeatEveryMinutes?: number | null;
  action: string;
  message?: string | null;
  aiCompose: boolean;
  templateName?: string | null;
  documentId?: number | null;
  targetStageId?: number | null;
  taskTitle?: string | null;
  taskDueHours?: number | null;
  active: boolean;
  conditions: PlaybookCondition[];
}

export interface Playbook {
  id: number | null;
  formId: number;
  formName?: string;
  formSlug?: string;
  agentId: number | null;
  active: boolean;
  goal: string;
  qualificationKeys: string[];
  quietStart: number;
  quietEnd: number;
  timezone: string;
  maxFollowUps: number;
  quotationDocumentId: number | null;
  rules: PlaybookRule[];
  updatedAt?: string | null;
  runsLast7d?: number;
}

export interface PlaybookRun {
  id: number;
  ruleId: string;
  ruleName: string;
  recordId: string;
  runCount: number;
  lastRunAt: string | null;
  nextEligibleAt: string | null;
  channel: string | null;
  outcome: string | null;
  status: string;
}

export interface RuleStat {
  ruleId: string;
  ruleName: string;
  matched: number;
  fired: number;
  note: string | null;
}

export interface PlaybookOptions {
  triggers: string[];
  actions: string[];
  ops: string[];
  interests: string[];
}

/** AI sales playbook per form — rules that follow up, send quotations and hand off. */
@Injectable({ providedIn: 'root' })
export class PlaybookService {
  private readonly api = inject(CrmApiService);

  list(): Observable<Playbook[]> {
    return this.api.get<Playbook[]>('/api/playbooks', undefined, { quiet: true });
  }

  forForm(formId: number): Observable<Playbook> {
    return this.api.get<Playbook>(`/api/playbooks/form/${formId}`, undefined, { quiet: true });
  }

  save(formId: number, body: Partial<Playbook>): Observable<Playbook> {
    return this.api.put<Playbook>(`/api/playbooks/form/${formId}`, body);
  }

  delete(id: number): Observable<string> {
    return this.api.delete(`/api/playbooks/${id}`);
  }

  runs(id: number): Observable<PlaybookRun[]> {
    return this.api.get<PlaybookRun[]>(`/api/playbooks/${id}/runs`, undefined, { quiet: true });
  }

  recordRuns(recordId: string): Observable<PlaybookRun[]> {
    return this.api.get<PlaybookRun[]>(`/api/playbooks/record/${recordId}/runs`, undefined, { quiet: true });
  }

  preview(id: number): Observable<RuleStat[]> {
    return this.api.post<RuleStat[]>(`/api/playbooks/${id}/preview`, {});
  }

  runNow(id: number): Observable<RuleStat[]> {
    return this.api.post<RuleStat[]>(`/api/playbooks/${id}/run-now`, {});
  }

  options(): Observable<PlaybookOptions> {
    return this.api.get<PlaybookOptions>('/api/playbooks/options', undefined, { quiet: true });
  }
}
