import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AbstractControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { FieldResponse, FieldType } from '../../core/models/crm.model';
import { optionsFor } from './dynamic-form.util';

/**
 * Renders a single metadata-defined control.
 *
 * Every branch binds through `formControlName` on the parent group, so the
 * component adds no state of its own — validation and value live in the form.
 */
@Component({
  selector: 'app-dynamic-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dynamic-field.component.html',
  styles: [
    `
      .choice-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1rem;
        padding: 0.35rem 0.1rem;
      }

      .json-input {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.75rem;
      }
    `,
  ],
})
export class DynamicFieldComponent {
  readonly field = input.required<FieldResponse>();
  readonly group = input.required<FormGroup>();

  /** Mirrors the FieldType enum for template comparisons. */
  readonly Type = FieldType;

  readonly control = computed<AbstractControl | null>(() =>
    this.group().get(this.field().fieldKey),
  );

  readonly options = computed<string[]>(() => optionsFor(this.field()));

  readonly invalid = computed(() => {
    const control = this.control();
    return !!control && control.invalid && (control.touched || control.dirty);
  });

  /** The single most useful message for the first failing rule. */
  readonly errorText = computed(() => {
    const control = this.control();
    if (!control?.errors) return '';
    const errors = control.errors;
    const label = this.field().label;

    if (errors['required']) return `${label} is required.`;
    if (errors['email']) return 'Enter a valid email address.';
    if (errors['min']) return `Minimum value is ${errors['min'].min}.`;
    if (errors['max']) return `Maximum value is ${errors['max'].max}.`;
    if (errors['minlength']) return `At least ${errors['minlength'].requiredLength} characters.`;
    if (errors['maxlength']) return `At most ${errors['maxlength'].requiredLength} characters.`;
    if (errors['pattern']) return `${label} is not in the expected format.`;
    return `${label} is invalid.`;
  });

  /** Native input type for the plain text-like field types. */
  readonly inputType = computed(() => {
    switch (this.field().fieldType) {
      case FieldType.NUMBER:
      case FieldType.DECIMAL:
        return 'number';
      case FieldType.EMAIL:
        return 'email';
      case FieldType.PHONE:
        return 'tel';
      case FieldType.PASSWORD:
        return 'password';
      case FieldType.DATE:
        return 'date';
      case FieldType.DATETIME:
        return 'datetime-local';
      case FieldType.TIME:
        return 'time';
      case FieldType.URL:
        return 'url';
      default:
        return 'text';
    }
  });

  readonly step = computed(() => (this.field().fieldType === FieldType.DECIMAL ? '0.01' : '1'));

  /** Multi-value choices are held as string[]; toggle one entry. */
  toggleChoice(option: string, checked: boolean): void {
    const control = this.control();
    if (!control) return;

    const current = Array.isArray(control.value) ? [...(control.value as string[])] : [];
    const next = checked
      ? current.includes(option)
        ? current
        : [...current, option]
      : current.filter((v) => v !== option);

    control.setValue(next);
    control.markAsDirty();
  }

  isChecked(option: string): boolean {
    const value = this.control()?.value;
    return Array.isArray(value) && value.includes(option);
  }

  onCheckboxChange(option: string, event: Event): void {
    this.toggleChoice(option, (event.target as HTMLInputElement).checked);
  }
}
