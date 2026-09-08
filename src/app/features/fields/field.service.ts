import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { FieldRequest, FieldResponse, FieldType } from '../../core/models/crm.model';

/**
 * Fields API — FormFieldController, @RequestMapping("/api/fields").
 *
 *   POST   /api/fields/{formId}   create a field on a form
 *   GET    /api/fields/{formId}   list a form's fields
 *   PUT    /api/fields/{id}       update
 *   DELETE /api/fields/{id}       delete
 */
@Injectable({ providedIn: 'root' })
export class FieldService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/fields';

  /** Sorted by displayOrder so the renderer and the builder agree on order. */
  getByForm(formId: number): Observable<FieldResponse[]> {
    return this.api
      .get<FieldResponse[]>(`${this.path}/${formId}`)
      .pipe(map((fields) => [...(fields ?? [])].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))));
  }

  create(formId: number, request: FieldRequest): Observable<FieldResponse> {
    return this.api.post<FieldResponse>(`${this.path}/${formId}`, request);
  }

  update(id: number, request: FieldRequest): Observable<FieldResponse> {
    return this.api.put<FieldResponse>(`${this.path}/${id}`, request);
  }

  delete(id: number): Observable<string> {
    return this.api.delete(`${this.path}/${id}`);
  }

  /** Field key derived from a label — lowercase, snake_case, no leading digit. */
  static toFieldKey(label: string): string {
    const key = label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return /^\d/.test(key) ? `f_${key}` : key;
  }

  /** Choice fields carry their options in `optionsJson`. */
  static parseOptions(field: Pick<FieldResponse, 'optionsJson'>): string[] {
    if (!field.optionsJson?.trim()) return [];
    try {
      const parsed = JSON.parse(field.optionsJson);
      if (Array.isArray(parsed)) {
        return parsed.map((o) => (typeof o === 'string' ? o : String(o?.label ?? o?.value ?? o)));
      }
    } catch {
      // Fall through to the comma-separated form authors often type by hand.
    }
    return field.optionsJson
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
  }

  static readonly CHOICE_TYPES: FieldType[] = [
    FieldType.SELECT,
    FieldType.MULTI_SELECT,
    FieldType.RADIO,
    FieldType.CHECKBOX,
  ];

  static isChoice(type: FieldType): boolean {
    return FieldService.CHOICE_TYPES.includes(type);
  }
}
