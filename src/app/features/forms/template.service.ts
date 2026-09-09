import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { FormResponse } from '../../core/models/crm.model';

export interface TemplateField {
  label: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  optionsJson: string | null;
  placeholder?: string | null;
}

export interface TemplateStage {
  name: string;
  code: string;
  sequence: number;
  isDefault: boolean;
  isFinal: boolean;
  color: string;
}

export interface TemplateAutomation {
  name: string;
  trigger: string;
  triggerStageCode: string | null;
  actionType: string;
  actionFieldKey: string | null;
  actionStageCode?: string | null;
  emailSubject: string | null;
  emailMessage: string | null;
  note: string;
  triggerStatusName?: string | null;
}

export interface TemplateWaTemplate {
  name: string;
  category: string;
  language: string;
  headerText?: string | null;
  bodyText: string;
  footerText?: string | null;
  purpose?: string | null;
}

export interface TemplateAgent {
  name: string;
  persona?: string | null;
  welcomeMessage?: string | null;
  pipelineMode?: string;
  stageHints?: { stageCode: string; hint: string }[];
}

export interface TemplatePlaybookRule {
  name: string;
  trigger: string;
  action: string;
  afterMinutes?: number | null;
  stageCodes?: string[];
  message?: string | null;
  aiCompose?: boolean;
}

export interface TemplatePlaybook {
  goal?: string | null;
  qualificationKeys?: string[];
  rules?: TemplatePlaybookRule[];
}

/** A vertical pack as the backend ships it (fields/stages/automations + optional extras). */
export interface FormTemplate {
  key: string;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  description: string;
  industry?: string | null;
  tags?: string[];
  fields: TemplateField[];
  stages: TemplateStage[];
  automations: TemplateAutomation[];
  whatsappTemplates?: TemplateWaTemplate[];
  agent?: TemplateAgent | null;
  playbook?: TemplatePlaybook | null;
}

export interface PackIncludes {
  fields: number;
  stages: number;
  automations: number;
  whatsappTemplates: number;
  agent: boolean;
  playbook: boolean;
  playbookRules: number;
}

/** Gallery card = the pack + install state for this workspace. */
export interface PackCard extends FormTemplate {
  builtin: boolean;
  customId: number | null;
  source: 'BUILTIN' | 'EXPORT' | 'IMPORT' | string;
  installed: boolean;
  installedFormId: number | null;
  installedAt: string | null;
  includes: PackIncludes;
}

interface PackView {
  pack: FormTemplate;
  builtin: boolean;
  customId: number | null;
  source: string;
  installed: boolean;
  installedFormId: number | null;
  installedAt: string | null;
  includes: PackIncludes;
}

export interface ApplyOptions {
  name?: string;
  includeAgent?: boolean;
  includePlaybook?: boolean;
  includeAutomations?: boolean;
  includeWhatsapp?: boolean;
}

export interface ApplyResult {
  form: FormResponse;
  fieldCount: number;
  stageCount: number;
  automationCount: number;
  whatsappDraftCount: number;
  agentId: number | null;
  playbookId: number | null;
  note: string;
}

export interface TemplateDraft {
  id: number;
  formId: number | null;
  packKey: string | null;
  name: string;
  category: string;
  language: string;
  headerText: string | null;
  bodyText: string;
  footerText: string | null;
  purpose: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'FAILED';
  error: string | null;
  submittedAt: string | null;
  createdAt: string;
}

/** Vertical packs — one click se form + pipeline + automations + WhatsApp drafts + AI agent + playbook. */
@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly api = inject(CrmApiService);

  catalog(): Observable<PackCard[]> {
    return this.api
      .get<PackView[]>('/api/templates', undefined, { quiet: true })
      .pipe(map((rows) => (rows ?? []).map((r) => TemplateService.flatten(r))));
  }

  apply(key: string, options?: ApplyOptions | string): Observable<ApplyResult> {
    const body: ApplyOptions = typeof options === 'string' ? { name: options } : (options ?? {});
    return this.api.post<ApplyResult>(`/api/templates/${key}/apply`, body);
  }

  exportForm(formId: number, name?: string, key?: string): Observable<PackCard> {
    return this.api
      .post<PackView>(`/api/templates/export/${formId}`, { name, key })
      .pipe(map((r) => TemplateService.flatten(r)));
  }

  importPack(json: string): Observable<PackCard> {
    return this.api.post<PackView>('/api/templates/import', json).pipe(map((r) => TemplateService.flatten(r)));
  }

  customJsonUrl(customId: number): string {
    return `/api/templates/custom/${customId}/json`;
  }

  deleteCustom(customId: number): Observable<string> {
    return this.api.delete(`/api/templates/custom/${customId}`);
  }

  drafts(): Observable<TemplateDraft[]> {
    return this.api.get<TemplateDraft[]>('/api/templates/drafts', undefined, { quiet: true });
  }

  submitDraft(id: number): Observable<TemplateDraft> {
    return this.api.post<TemplateDraft>(`/api/templates/drafts/${id}/submit`, {});
  }

  deleteDraft(id: number): Observable<string> {
    return this.api.delete(`/api/templates/drafts/${id}`);
  }

  private static flatten(r: PackView): PackCard {
    return {
      ...r.pack,
      tags: r.pack.tags ?? [],
      whatsappTemplates: r.pack.whatsappTemplates ?? [],
      builtin: r.builtin,
      customId: r.customId,
      source: r.source,
      installed: r.installed,
      installedFormId: r.installedFormId,
      installedAt: r.installedAt,
      includes: r.includes,
    };
  }
}
