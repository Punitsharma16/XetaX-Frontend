import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { FormResponse } from '../../core/models/crm.model';

export interface TemplateField {
  label: string;
  fieldKey: string;
  fieldType: string;
  required: boolean;
  optionsJson: string | null;
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
  emailSubject: string | null;
  emailMessage: string | null;
  note: string;
  triggerStatusName?: string | null;
}

export interface FormTemplate {
  key: string;
  name: string;
  icon: string;
  color: string;
  tagline: string;
  description: string;
  fields: TemplateField[];
  stages: TemplateStage[];
  automations: TemplateAutomation[];
}

export interface ApplyResult {
  form: FormResponse;
  fieldCount: number;
  stageCount: number;
  automationCount: number;
  note: string;
}

/** Business templates — one click se pura form+stages+draft automations. */
@Injectable({ providedIn: 'root' })
export class TemplateService {
  private readonly api = inject(CrmApiService);

  catalog(): Observable<FormTemplate[]> {
    return this.api.get<FormTemplate[]>('/api/templates', undefined, { quiet: true });
  }

  apply(key: string, name?: string): Observable<ApplyResult> {
    return this.api.post<ApplyResult>(`/api/templates/${key}/apply`, { name });
  }
}
