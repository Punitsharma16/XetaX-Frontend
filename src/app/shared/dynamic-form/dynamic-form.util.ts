import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';

import { FieldResponse, FieldType, FieldValidation } from '../../core/models/crm.model';
import { FieldService } from '../../features/fields/field.service';

/**
 * Metadata → reactive form.
 *
 * Nothing here is hardcoded per form: controls, validators and value coercion
 * are all derived from the FieldResponse list the backend returns.
 */

/** Parsed `validationJson`, tolerating an unset or malformed string. */
export function parseValidation(field: FieldResponse): FieldValidation {
  if (!field.validationJson?.trim()) return {};
  try {
    return JSON.parse(field.validationJson) as FieldValidation;
  } catch {
    return {};
  }
}

export function validatorsFor(field: FieldResponse): ValidatorFn[] {
  const validators: ValidatorFn[] = [];
  const rules = parseValidation(field);

  if (field.required) {
    // A false checkbox is a legitimate value; requiredTrue would reject it.
    validators.push(field.fieldType === FieldType.BOOLEAN ? Validators.required : Validators.required);
  }

  switch (field.fieldType) {
    case FieldType.EMAIL:
      validators.push(Validators.email);
      break;
    case FieldType.URL:
      validators.push(Validators.pattern(/^https?:\/\/.+/i));
      break;
    case FieldType.PHONE:
      validators.push(Validators.pattern(/^[+0-9()\-\s]{6,20}$/));
      break;
    case FieldType.NUMBER:
    case FieldType.DECIMAL:
      if (rules.min !== undefined) validators.push(Validators.min(rules.min));
      if (rules.max !== undefined) validators.push(Validators.max(rules.max));
      break;
    default:
      break;
  }

  if (rules.minLength !== undefined) validators.push(Validators.minLength(rules.minLength));
  if (rules.maxLength !== undefined) validators.push(Validators.maxLength(rules.maxLength));
  if (rules.pattern) validators.push(Validators.pattern(rules.pattern));

  return validators;
}

/** Initial control value: existing record value → default → type-appropriate blank. */
export function initialValue(field: FieldResponse, existing: unknown): unknown {
  if (existing !== undefined && existing !== null && existing !== '') {
    return coerceIn(field, existing);
  }

  if (field.defaultValue) {
    return coerceIn(field, field.defaultValue);
  }

  switch (field.fieldType) {
    case FieldType.BOOLEAN:
      return false;
    case FieldType.MULTI_SELECT:
    case FieldType.CHECKBOX:
      return [];
    default:
      return '';
  }
}

/** Server value → control value. */
function coerceIn(field: FieldResponse, value: unknown): unknown {
  switch (field.fieldType) {
    case FieldType.BOOLEAN:
      return value === true || value === 'true' || value === 1 || value === '1';

    case FieldType.MULTI_SELECT:
    case FieldType.CHECKBOX:
      if (Array.isArray(value)) return value.map(String);
      if (typeof value === 'string' && value.trim()) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
          return value.split(',').map((v) => v.trim()).filter(Boolean);
        }
      }
      return [];

    case FieldType.DATE:
      // <input type="date"> needs yyyy-MM-dd, never a full ISO timestamp.
      return String(value).substring(0, 10);

    case FieldType.DATETIME:
      return String(value).substring(0, 16);

    case FieldType.JSON:
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);

    default:
      return value;
  }
}

/** Control value → server value. */
export function coerceOut(field: FieldResponse, value: unknown): unknown {
  if (value === '' || value === null || value === undefined) return null;

  switch (field.fieldType) {
    case FieldType.NUMBER:
      return Number.parseInt(String(value), 10);
    case FieldType.DECIMAL:
      return Number.parseFloat(String(value));
    case FieldType.BOOLEAN:
      return Boolean(value);
    case FieldType.JSON:
      try {
        return JSON.parse(String(value));
      } catch {
        // Keep the raw text rather than dropping what the user typed.
        return value;
      }
    default:
      return value;
  }
}

/** Fields the renderer should draw — hidden ones are configuration-only. */
export function visibleFields(fields: FieldResponse[]): FieldResponse[] {
  return fields.filter((f) => !f.hidden);
}

export function buildFormGroup(
  fields: FieldResponse[],
  values: Record<string, unknown> = {},
): FormGroup {
  const group: Record<string, FormControl> = {};

  for (const field of visibleFields(fields)) {
    group[field.fieldKey] = new FormControl(
      initialValue(field, values[field.fieldKey]),
      validatorsFor(field),
    );
  }

  return new FormGroup(group);
}

/** Form value → the `data` map the backend stores. */
export function toRecordData(
  fields: FieldResponse[],
  value: Record<string, unknown>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const field of visibleFields(fields)) {
    data[field.fieldKey] = coerceOut(field, value[field.fieldKey]);
  }

  return data;
}

/** Human-readable cell text for a record value. */
export function displayValue(field: FieldResponse, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';

  switch (field.fieldType) {
    case FieldType.BOOLEAN:
      return value ? 'Yes' : 'No';

    case FieldType.MULTI_SELECT:
    case FieldType.CHECKBOX:
      return Array.isArray(value) ? value.join(', ') : String(value);

    case FieldType.DATE:
      return formatDate(value, false);

    case FieldType.DATETIME:
      return formatDate(value, true);

    case FieldType.JSON:
      return typeof value === 'string' ? value : JSON.stringify(value);

    default:
      return String(value);
  }
}

function formatDate(value: unknown, withTime: boolean): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return withTime ? date.toLocaleString() : date.toLocaleDateString();
}

/** Option list for choice fields. */
export function optionsFor(field: FieldResponse): string[] {
  return FieldService.parseOptions(field);
}
