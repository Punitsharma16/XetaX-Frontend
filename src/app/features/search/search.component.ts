import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Page, emptyPage } from '../../core/models/api.model';
import {
  FieldResponse,
  FieldType,
  FilterValue,
  FormResponse,
  RecordResponse,
  StageResponse,
} from '../../core/models/crm.model';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import {
  EmptyStateComponent,
  TableSkeletonComponent,
} from '../../shared/components/state/state-views.component';
import { displayValue, optionsFor, visibleFields } from '../../shared/dynamic-form/dynamic-form.util';
import { FieldService } from '../fields/field.service';
import { FormService } from '../forms/form.service';
import { RecordService } from '../records/record.service';
import { StageService } from '../stages/stage.service';

/** Operators the UI offers, mapped onto what RecordSearchRequest.filters accepts. */
type Operator = 'equals' | 'contains' | 'between' | 'range';

interface FilterRow {
  /** Local identity so @for can track rows before they are complete. */
  uid: number;
  fieldKey: string;
  operator: Operator;
  value: string;
  min: string;
  max: string;
  from: string;
  to: string;
}

/**
 * Advanced search.
 *
 * Builds the `filters` map of RecordSearchRequest field by field:
 *  - text/choice → a scalar value (or a `{ value }` object for `contains`)
 *  - number      → `{ min, max }`
 *  - date        → `{ from, to }`
 * These are exactly the shapes FilterValue declares on the backend.
 */
@Component({
  selector: 'app-search',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    PaginationComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent {
  private readonly formService = inject(FormService);
  private readonly fieldService = inject(FieldService);
  private readonly stageService = inject(StageService);
  private readonly recordService = inject(RecordService);
  private readonly toast = inject(ToastService);

  readonly forms = signal<FormResponse[]>([]);
  readonly formsLoading = signal(true);

  readonly selectedSlug = signal('');
  readonly fields = signal<FieldResponse[]>([]);
  readonly stages = signal<StageResponse[]>([]);
  readonly metaLoading = signal(false);

  readonly term = signal('');
  readonly sortBy = signal('createdAt');
  readonly direction = signal<'ASC' | 'DESC'>('DESC');
  readonly rows = signal<FilterRow[]>([]);
  private nextUid = 1;

  readonly searching = signal(false);
  readonly searched = signal(false);
  readonly page = signal<Page<RecordResponse>>(emptyPage<RecordResponse>());
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);

  /** Only fields the author marked filterable can be used as criteria. */
  readonly filterableFields = computed(() => {
    const filterable = this.fields().filter((f) => f.filterable && !f.hidden);
    // Fall back to every visible field when nothing is explicitly filterable,
    // so the screen is still usable on a form that was never annotated.
    return filterable.length ? filterable : visibleFields(this.fields());
  });

  readonly sortableFields = computed(() =>
    this.fields().filter((f) => f.sortable && !f.hidden),
  );

  readonly columns = computed(() => visibleFields(this.fields()).slice(0, 6));

  readonly selectedForm = computed(
    () => this.forms().find((f) => f.slug === this.selectedSlug()) ?? null,
  );

  constructor() {
    this.formService.getAll().subscribe({
      next: (forms) => {
        this.forms.set(forms ?? []);
        this.formsLoading.set(false);
      },
      error: () => {
        this.forms.set([]);
        this.formsLoading.set(false);
      },
    });
  }

  // ---------------------------------------------------------- form selection

  onFormChange(slug: string): void {
    this.selectedSlug.set(slug);
    this.rows.set([]);
    this.term.set('');
    this.searched.set(false);
    this.page.set(emptyPage<RecordResponse>());
    this.sortBy.set('createdAt');

    if (!slug) {
      this.fields.set([]);
      this.stages.set([]);
      return;
    }

    const form = this.forms().find((f) => f.slug === slug);
    if (!form) return;

    this.metaLoading.set(true);
    forkJoin({
      fields: this.fieldService.getByForm(form.id).pipe(catchError(() => of([]))),
      stages: this.stageService.getByForm(form.id).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ fields, stages }) => {
        this.fields.set(fields ?? []);
        this.stages.set(stages ?? []);
        this.metaLoading.set(false);
      },
      error: () => this.metaLoading.set(false),
    });
  }

  // ------------------------------------------------------------ filter rows

  addRow(): void {
    const first = this.filterableFields()[0];
    if (!first) {
      this.toast.warning('No filterable fields', 'Mark fields as filterable in the form builder.');
      return;
    }

    this.rows.update((rows) => [
      ...rows,
      {
        uid: this.nextUid++,
        fieldKey: first.fieldKey,
        operator: this.defaultOperator(first),
        value: '',
        min: '',
        max: '',
        from: '',
        to: '',
      },
    ]);
  }

  removeRow(uid: number): void {
    this.rows.update((rows) => rows.filter((r) => r.uid !== uid));
  }

  clearRows(): void {
    this.rows.set([]);
    this.term.set('');
  }

  fieldOf(key: string): FieldResponse | undefined {
    return this.fields().find((f) => f.fieldKey === key);
  }

  optionsOf(key: string): string[] {
    const field = this.fieldOf(key);
    return field ? optionsFor(field) : [];
  }

  /** Operators that make sense for a field's type. */
  operatorsFor(key: string): { value: Operator; label: string }[] {
    const field = this.fieldOf(key);
    if (!field) return [{ value: 'equals', label: 'Equals' }];

    switch (field.fieldType) {
      case FieldType.NUMBER:
      case FieldType.DECIMAL:
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'range', label: 'Between' },
        ];
      case FieldType.DATE:
      case FieldType.DATETIME:
        return [
          { value: 'equals', label: 'On' },
          { value: 'between', label: 'Between' },
        ];
      case FieldType.SELECT:
      case FieldType.RADIO:
      case FieldType.MULTI_SELECT:
      case FieldType.CHECKBOX:
      case FieldType.BOOLEAN:
        return [{ value: 'equals', label: 'Equals' }];
      default:
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
        ];
    }
  }

  private defaultOperator(field: FieldResponse): Operator {
    switch (field.fieldType) {
      case FieldType.NUMBER:
      case FieldType.DECIMAL:
      case FieldType.DATE:
      case FieldType.DATETIME:
      case FieldType.SELECT:
      case FieldType.RADIO:
      case FieldType.BOOLEAN:
        return 'equals';
      default:
        return 'contains';
    }
  }

  onFieldChange(uid: number, key: string): void {
    const field = this.fieldOf(key);
    this.rows.update((rows) =>
      rows.map((r) =>
        r.uid === uid
          ? {
              ...r,
              fieldKey: key,
              operator: field ? this.defaultOperator(field) : 'equals',
              value: '',
              min: '',
              max: '',
              from: '',
              to: '',
            }
          : r,
      ),
    );
  }

  patchRow(uid: number, patch: Partial<FilterRow>): void {
    this.rows.update((rows) => rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  /** Which editor to draw for a row. */
  editorFor(row: FilterRow): 'range' | 'between' | 'select' | 'boolean' | 'date' | 'number' | 'text' {
    if (row.operator === 'range') return 'range';
    if (row.operator === 'between') return 'between';

    const field = this.fieldOf(row.fieldKey);
    switch (field?.fieldType) {
      case FieldType.SELECT:
      case FieldType.RADIO:
      case FieldType.MULTI_SELECT:
      case FieldType.CHECKBOX:
        return 'select';
      case FieldType.BOOLEAN:
        return 'boolean';
      case FieldType.DATE:
      case FieldType.DATETIME:
        return 'date';
      case FieldType.NUMBER:
      case FieldType.DECIMAL:
        return 'number';
      default:
        return 'text';
    }
  }

  // --------------------------------------------------------------- querying

  private buildFilters(): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    for (const row of this.rows()) {
      const field = this.fieldOf(row.fieldKey);
      if (!field) continue;

      if (row.operator === 'range') {
        const min = row.min !== '' ? Number(row.min) : undefined;
        const max = row.max !== '' ? Number(row.max) : undefined;
        if (min === undefined && max === undefined) continue;
        filters[row.fieldKey] = { min, max } satisfies FilterValue;
        continue;
      }

      if (row.operator === 'between') {
        if (!row.from && !row.to) continue;
        filters[row.fieldKey] = {
          from: row.from || undefined,
          to: row.to || undefined,
        } satisfies FilterValue;
        continue;
      }

      if (row.value === '') continue;

      if (row.operator === 'contains') {
        // The object form lets the backend treat it as a value match rather
        // than an exact scalar comparison.
        filters[row.fieldKey] = { value: row.value } satisfies FilterValue;
        continue;
      }

      // equals — send the scalar, typed the way the field stores it
      if (field.fieldType === FieldType.NUMBER) {
        filters[row.fieldKey] = Number.parseInt(row.value, 10);
      } else if (field.fieldType === FieldType.DECIMAL) {
        filters[row.fieldKey] = Number.parseFloat(row.value);
      } else if (field.fieldType === FieldType.BOOLEAN) {
        filters[row.fieldKey] = row.value === 'true';
      } else {
        filters[row.fieldKey] = row.value;
      }
    }

    return filters;
  }

  search(resetPage = true): void {
    const slug = this.selectedSlug();
    if (!slug) {
      this.toast.warning('Select a form', 'Advanced search runs against one form at a time.');
      return;
    }

    if (resetPage) this.pageIndex.set(0);

    this.searching.set(true);
    this.recordService
      .search(slug, {
        page: this.pageIndex(),
        size: this.pageSize(),
        sortBy: this.sortBy(),
        direction: this.direction(),
        search: this.term() || undefined,
        filters: this.buildFilters(),
      })
      .subscribe({
        next: (page) => {
          this.page.set(page ?? emptyPage<RecordResponse>(this.pageSize()));
          this.searching.set(false);
          this.searched.set(true);
        },
        error: () => {
          this.page.set(emptyPage<RecordResponse>(this.pageSize()));
          this.searching.set(false);
          this.searched.set(true);
        },
      });
  }

  onPageChange(page: number): void {
    this.pageIndex.set(page);
    this.search(false);
  }

  onSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
    this.search(false);
  }

  cell(record: RecordResponse, field: FieldResponse): string {
    return displayValue(field, record.data?.[field.fieldKey]);
  }

  stageOf(record: RecordResponse): StageResponse | null {
    return this.stages().find((s) => s.id === record.stageId) ?? null;
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }
}
