import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { FieldResponse, FieldType } from '../../../core/models/crm.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  EmptyStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { FieldService } from '../field.service';

/** Grouped for the type picker; labels/icons are UI-only. */
const TYPE_META: Record<FieldType, { label: string; icon: string; group: string }> = {
  [FieldType.TEXT]: { label: 'Text', icon: 'bi-fonts', group: 'Basic' },
  [FieldType.TEXTAREA]: { label: 'Text area', icon: 'bi-textarea-resize', group: 'Basic' },
  [FieldType.NUMBER]: { label: 'Number', icon: 'bi-123', group: 'Basic' },
  [FieldType.DECIMAL]: { label: 'Decimal', icon: 'bi-percent', group: 'Basic' },
  [FieldType.EMAIL]: { label: 'Email', icon: 'bi-envelope', group: 'Contact' },
  [FieldType.PHONE]: { label: 'Phone', icon: 'bi-telephone', group: 'Contact' },
  [FieldType.URL]: { label: 'URL', icon: 'bi-link-45deg', group: 'Contact' },
  [FieldType.PASSWORD]: { label: 'Password', icon: 'bi-key', group: 'Basic' },
  [FieldType.DATE]: { label: 'Date', icon: 'bi-calendar-date', group: 'Date & time' },
  [FieldType.DATETIME]: { label: 'Date & time', icon: 'bi-calendar-event', group: 'Date & time' },
  [FieldType.TIME]: { label: 'Time', icon: 'bi-clock', group: 'Date & time' },
  [FieldType.BOOLEAN]: { label: 'Yes / No', icon: 'bi-toggle-on', group: 'Choice' },
  [FieldType.SELECT]: { label: 'Dropdown', icon: 'bi-menu-button-wide', group: 'Choice' },
  [FieldType.MULTI_SELECT]: { label: 'Multi select', icon: 'bi-list-check', group: 'Choice' },
  [FieldType.RADIO]: { label: 'Radio', icon: 'bi-record-circle', group: 'Choice' },
  [FieldType.CHECKBOX]: { label: 'Checkboxes', icon: 'bi-check2-square', group: 'Choice' },
  [FieldType.FILE]: { label: 'File', icon: 'bi-paperclip', group: 'Media' },
  [FieldType.IMAGE]: { label: 'Image', icon: 'bi-image', group: 'Media' },
  [FieldType.JSON]: { label: 'JSON', icon: 'bi-braces', group: 'Advanced' },
};

@Component({
  selector: 'app-fields-panel',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, EmptyStateComponent, TableSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fields-panel.component.html',
  styleUrl: './fields-panel.component.css',
})
export class FieldsPanelComponent {
  private readonly fieldService = inject(FieldService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly formId = input.required<number>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly fields = signal<FieldResponse[]>([]);

  readonly modalOpen = signal(false);
  readonly editing = signal<FieldResponse | null>(null);
  private keyTouched = false;

  readonly typeGroups = Object.entries(
    Object.entries(TYPE_META).reduce<Record<string, { type: FieldType; label: string; icon: string }[]>>(
      (acc, [type, meta]) => {
        (acc[meta.group] ??= []).push({ type: type as FieldType, label: meta.label, icon: meta.icon });
        return acc;
      },
      {},
    ),
  ).map(([group, types]) => ({ group, types }));

  readonly editorForm = this.fb.nonNullable.group({
    label: ['', [Validators.required, Validators.maxLength(120)]],
    fieldKey: ['', [Validators.required, Validators.pattern(/^[a-z_][a-z0-9_]*$/)]],
    fieldType: [FieldType.TEXT, Validators.required],
    placeholder: [''],
    defaultValue: [''],
    optionsText: [''],
    required: [false],
    uniqueField: [false],
    searchable: [true],
    filterable: [false],
    sortable: [false],
    hidden: [false],
    displayOrder: [0],
  });

  constructor() {
    // input() is not readable in the constructor body; an effect keeps the
    // panel in step with whichever form the parent is showing.
    effect(() => {
      const id = this.formId();
      if (id) this.load(id);
    });
  }

  meta(type: FieldType) {
    return TYPE_META[type] ?? { label: type, icon: 'bi-question-circle', group: 'Other' };
  }

  isChoice(type: FieldType): boolean {
    return FieldService.isChoice(type);
  }

  optionsOf(field: FieldResponse): string[] {
    return FieldService.parseOptions(field);
  }

  load(formId = this.formId()): void {
    this.loading.set(true);
    this.fieldService.getByForm(formId).subscribe({
      next: (fields) => {
        this.fields.set(fields ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.fields.set([]);
        this.loading.set(false);
      },
    });
  }

  // ---------------------------------------------------------------- editor

  openCreate(): void {
    this.editing.set(null);
    this.keyTouched = false;
    this.editorForm.reset({
      label: '',
      fieldKey: '',
      fieldType: FieldType.TEXT,
      placeholder: '',
      defaultValue: '',
      optionsText: '',
      required: false,
      uniqueField: false,
      searchable: true,
      filterable: false,
      sortable: false,
      hidden: false,
      displayOrder: this.fields().length + 1,
    });
    this.modalOpen.set(true);
  }

  openEdit(field: FieldResponse): void {
    this.editing.set(field);
    this.keyTouched = true;
    this.editorForm.reset({
      label: field.label,
      fieldKey: field.fieldKey,
      fieldType: field.fieldType,
      placeholder: field.placeholder ?? '',
      defaultValue: field.defaultValue ?? '',
      optionsText: FieldService.parseOptions(field).join('\n'),
      required: field.required ?? false,
      uniqueField: field.uniqueField ?? false,
      searchable: field.searchable ?? false,
      filterable: field.filterable ?? false,
      sortable: field.sortable ?? false,
      hidden: field.hidden ?? false,
      displayOrder: field.displayOrder ?? 0,
    });
    this.modalOpen.set(true);
  }

  closeEditor(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  onLabelInput(): void {
    if (this.keyTouched) return;
    this.editorForm.controls.fieldKey.setValue(
      FieldService.toFieldKey(this.editorForm.controls.label.value),
    );
  }

  onKeyInput(): void {
    this.keyTouched = true;
  }

  pickType(type: FieldType): void {
    this.editorForm.controls.fieldType.setValue(type);
  }

  save(): void {
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }

    const raw = this.editorForm.getRawValue();
    const options = raw.optionsText
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);

    if (FieldService.isChoice(raw.fieldType) && !options.length) {
      this.toast.warning('Options required', 'Add at least one option for this field type.');
      return;
    }

    const payload = {
      label: raw.label,
      fieldKey: raw.fieldKey,
      fieldType: raw.fieldType,
      placeholder: raw.placeholder || undefined,
      defaultValue: raw.defaultValue || undefined,
      // The backend stores options as a raw JSON string.
      optionsJson: FieldService.isChoice(raw.fieldType) ? JSON.stringify(options) : undefined,
      required: raw.required,
      uniqueField: raw.uniqueField,
      searchable: raw.searchable,
      filterable: raw.filterable,
      sortable: raw.sortable,
      hidden: raw.hidden,
      displayOrder: raw.displayOrder,
    };

    const current = this.editing();
    this.saving.set(true);

    const request$ = current
      ? this.fieldService.update(current.id, payload)
      : this.fieldService.create(this.formId(), payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Field updated' : 'Field added', payload.label);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(field: FieldResponse): void {
    this.confirm
      .ask({
        title: `Delete "${field.label}"?`,
        message: 'Existing record values stored under this field key will no longer be shown.',
        confirmText: 'Delete field',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.fieldService.delete(field.id).subscribe({
          next: () => {
            this.toast.success('Field deleted', field.label);
            this.load();
          },
        });
      });
  }

  /**
   * Reorder by rewriting `displayOrder` on the two swapped fields — the
   * backend has no dedicated reorder endpoint, so ordering is expressed
   * through the field update it already supports.
   */
  move(field: FieldResponse, direction: -1 | 1): void {
    const list = this.fields();
    const index = list.findIndex((f) => f.id === field.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;

    const other = list[target];
    const reordered = [...list];
    reordered[index] = other;
    reordered[target] = field;
    this.fields.set(reordered); // optimistic: keep the list responsive

    const toRequest = (f: FieldResponse, order: number) => ({
      label: f.label,
      fieldKey: f.fieldKey,
      fieldType: f.fieldType,
      placeholder: f.placeholder,
      defaultValue: f.defaultValue,
      optionsJson: f.optionsJson,
      validationJson: f.validationJson,
      required: f.required,
      uniqueField: f.uniqueField,
      searchable: f.searchable,
      filterable: f.filterable,
      sortable: f.sortable,
      hidden: f.hidden,
      displayOrder: order,
    });

    this.fieldService.update(field.id, toRequest(field, target + 1)).subscribe({
      next: () =>
        this.fieldService.update(other.id, toRequest(other, index + 1)).subscribe({
          next: () => this.load(),
          error: () => this.load(),
        }),
      error: () => this.load(),
    });
  }
}
