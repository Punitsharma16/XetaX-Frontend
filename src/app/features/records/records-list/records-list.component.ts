import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Page, emptyPage } from '../../../core/models/api.model';
import {
  FieldResponse,
  FieldType,
  FormResponse,
  RecordResponse,
  StageResponse,
} from '../../../core/models/crm.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { AiPanelComponent } from '../../../shared/components/ai/ai-panel.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { DynamicFieldComponent } from '../../../shared/dynamic-form/dynamic-field.component';
import {
  buildFormGroup,
  displayValue,
  optionsFor,
  toRecordData,
  visibleFields,
} from '../../../shared/dynamic-form/dynamic-form.util';
import { FieldService } from '../../fields/field.service';
import { BulkUploadResult } from '../record.service';
import { FormService } from '../../forms/form.service';
import { StageService } from '../../stages/stage.service';
import { RecordService } from '../record.service';
import { PermissionService } from '../../../core/services/permission.service';
import { TeamService } from '../../users/team.service';
import { DocumentFile, DocumentService } from '../../documents/document.service';

/**
 * Records workspace.
 *
 * Columns, the create/edit form and validation are all generated from the
 * selected form's field metadata — nothing about a specific form is hardcoded.
 */
@Component({
  selector: 'app-records-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SearchBoxComponent,
    PaginationComponent,
    AiPanelComponent,
    ModalComponent,
    DynamicFieldComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './records-list.component.html',
  styleUrl: './records-list.component.css',
})
export class RecordsListComponent {
  private readonly recordService = inject(RecordService);
  private readonly formService = inject(FormService);
  private readonly fieldService = inject(FieldService);
  private readonly stageService = inject(StageService);
  private readonly toast = inject(ToastService);
  readonly permsSvc = inject(PermissionService);
  private readonly teamService = inject(TeamService);
  private readonly documentService = inject(DocumentService);

  /* ------------------------------------------------- bulk transfer state */
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly assignees = signal<{ userId: string; name: string }[]>([]);
  readonly transferOpen = signal(false);
  readonly transferring = signal(false);
  transferTo = '';

  get canTransfer(): boolean {
    return this.permsSvc.has('records.transfer');
  }

  /* --------------------------------------------- bulk document send state */
  readonly docSendOpen = signal(false);
  readonly docSending = signal(false);
  readonly docLibrary = signal<DocumentFile[]>([]);
  docSendId = '';
  docSendChannel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP';
  docSendSubject = '';
  docSendMessage = '';
  docSendPersonalize = true;

  openDocSend(): void {
    if (!this.selectedIds().size) return;
    if (!this.docLibrary().length) {
      this.documentService.list().subscribe({
        next: (docs) => this.docLibrary.set(docs ?? []),
        error: () => this.docLibrary.set([]),
      });
    }
    this.docSendId = '';
    this.docSendSubject = '';
    this.docSendMessage = '';
    this.docSendPersonalize = true;
    this.docSendOpen.set(true);
  }

  selectedDoc(): DocumentFile | undefined {
    return this.docLibrary().find((d) => String(d.id) === this.docSendId);
  }

  doDocSend(): void {
    const doc = this.selectedDoc();
    if (!doc) {
      this.toast.warning('Pick a document to send');
      return;
    }
    if (this.docSendChannel === 'EMAIL' && !this.docSendSubject.trim()) {
      this.toast.warning('Subject is required for email');
      return;
    }
    this.docSending.set(true);
    this.documentService
      .sendBulk(
        doc.id,
        [...this.selectedIds()],
        this.docSendChannel,
        this.docSendSubject.trim() || undefined,
        this.docSendMessage.trim() || undefined,
        this.docSendPersonalize,
      )
      .subscribe({
        next: (result) => {
          this.docSending.set(false);
          this.docSendOpen.set(false);
          this.clearSelection();
          if (result.failed > 0) {
            this.toast.warning(
              `${result.sent} sent, ${result.failed} failed`,
              result.failedNames.slice(0, 5).join(', '),
            );
          } else {
            this.toast.success(`Document sent to ${result.sent} records`);
          }
        },
        error: () => this.docSending.set(false),
      });
  }

  loadAssignees(): void {
    if (!this.canTransfer || this.assignees().length) return;
    this.teamService.assignees().subscribe({
      next: (list) => this.assignees.set(list),
      error: () => this.assignees.set([]),
    });
  }

  toggleSelect(id: string): void {
    const next = new Set(this.selectedIds());
    next.has(id) ? next.delete(id) : next.add(id);
    this.selectedIds.set(next);
  }

  toggleSelectAll(ids: string[]): void {
    const current = this.selectedIds();
    const allOn = ids.every((id) => current.has(id));
    this.selectedIds.set(allOn ? new Set() : new Set(ids));
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  openTransfer(): void {
    this.loadAssignees();
    this.transferTo = '';
    this.transferOpen.set(true);
  }

  doTransfer(): void {
    if (!this.transferTo || !this.selectedIds().size) return;
    this.transferring.set(true);
    this.recordService.transfer([...this.selectedIds()], this.transferTo).subscribe({
      next: (result) => {
        this.transferring.set(false);
        this.transferOpen.set(false);
        this.toast.success('Records transferred', `${result.moved} records moved`);
        this.clearSelection();
        this.loadRecords();
      },
      error: () => this.transferring.set(false),
    });
  }

  viewIds(): string[] {
    return this.view().content.map((record) => record.id);
  }

  assigneeName(userId: string | null | undefined): string {
    if (!userId) return '';
    return this.assignees().find((a) => a.userId === userId)?.name ?? '…';
  }
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  /** Route param `:slug` — absent on the picker screen. */
  readonly slug = input<string | undefined>(undefined);

  // ---- form catalogue (picker) ----
  readonly forms = signal<FormResponse[]>([]);
  readonly formsLoading = signal(true);

  // ---- selected form context ----
  readonly form = signal<FormResponse | null>(null);
  readonly fields = signal<FieldResponse[]>([]);
  readonly stages = signal<StageResponse[]>([]);
  readonly metaLoading = signal(false);
  readonly metaFailed = signal(false);

  // ---- records ----
  readonly page = signal<Page<RecordResponse>>(emptyPage<RecordResponse>());
  readonly recordsLoading = signal(false);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly term = signal('');

  // ---- filters (predefined + advanced, all auto-applied) ----

  /** Choice/boolean dropdowns: fieldKey -> selected option. */
  readonly quickFilters = signal<Record<string, string>>({});

  /** Missing key → '' so the "All …" option stays selected (avoids NG8102 in the template). */
  filterValue(map: Record<string, string>, key: string): string {
    return map[key] ?? '';
  }
  /** Date-preset dropdowns: fieldKey -> 'today' | 'week' | 'month'. */
  readonly dateFilters = signal<Record<string, string>>({});
  /** Advanced panel values: fieldKey -> contains/min/max/from/to. */
  readonly advFilters = signal<Record<string, { contains?: string; min?: string; max?: string; from?: string; to?: string }>>({});
  readonly advOpen = signal(false);

  /** Stage + created/updated filters are applied locally (the search API only
      filters on form fields), over the latest LOCAL_FETCH_SIZE records. */
  readonly stageFilter = signal<number | null>(null);
  readonly createdPreset = signal('');
  readonly updatedPreset = signal('');
  private readonly localRecords = signal<RecordResponse[]>([]);
  private static readonly LOCAL_FETCH_SIZE = 200;

  readonly localMode = computed(
    () => this.stageFilter() !== null || !!this.createdPreset() || !!this.updatedPreset(),
  );

  /** What the table/pagination actually render — server page, or the locally
      filtered slice when a stage/date filter is active. */
  readonly view = computed<Page<RecordResponse>>(() => {
    if (!this.localMode()) return this.page();
    const filtered = this.localRecords().filter((r) => this.matchesLocal(r));
    const size = this.pageSize();
    const number = Math.min(this.pageIndex(), Math.max(0, Math.ceil(filtered.length / size) - 1));
    return {
      content: filtered.slice(number * size, number * size + size),
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
      size,
      number,
      first: number === 0,
      last: (number + 1) * size >= filtered.length,
      numberOfElements: Math.min(size, filtered.length - number * size),
      empty: filtered.length === 0,
    };
  });

  private matchesLocal(record: RecordResponse): boolean {
    const stage = this.stageFilter();
    if (stage !== null && record.stageId !== stage) return false;
    if (this.createdPreset() && !this.inPreset(record.createdAt, this.createdPreset())) return false;
    if (this.updatedPreset() && !this.inPreset(record.updatedAt, this.updatedPreset())) return false;
    return true;
  }

  /** createdAt/updatedAt arrive as ISO LocalDateTime strings — compare dates. */
  private inPreset(dateTime: string | null | undefined, preset: string): boolean {
    if (!dateTime) return false;
    const day = String(dateTime).slice(0, 10);
    const range = this.presetRange(preset);
    return day >= range.from && day <= range.to;
  }

  readonly advActiveCount = computed(
    () =>
      Object.values(this.advFilters()).filter(
        (v) => v.contains || v.min || v.max || v.from || v.to,
      ).length,
  );

  readonly hasQuickFilters = computed(
    () =>
      Object.keys(this.quickFilters()).length > 0 ||
      Object.keys(this.dateFilters()).length > 0 ||
      this.advActiveCount() > 0 ||
      this.stageFilter() !== null ||
      !!this.createdPreset() ||
      !!this.updatedPreset(),
  );

  private static readonly CHOICE_TYPES = [
    FieldType.SELECT,
    FieldType.MULTI_SELECT,
    FieldType.RADIO,
    FieldType.CHECKBOX,
    FieldType.BOOLEAN,
  ];
  private static readonly TEXT_TYPES = [
    FieldType.TEXT,
    FieldType.TEXTAREA,
    FieldType.EMAIL,
    FieldType.PHONE,
    FieldType.URL,
  ];
  private static readonly NUMBER_TYPES = [FieldType.NUMBER, FieldType.DECIMAL];
  private static readonly DATE_TYPES = [FieldType.DATE, FieldType.DATETIME];

  /**
   * Predefined dropdowns in the bar: the form's choice/boolean fields —
   * filterable-flagged ones first, capped so the bar stays compact.
   */
  readonly quickFilterFields = computed(() =>
    this.fields()
      .filter((f) => RecordsListComponent.CHOICE_TYPES.includes(f.fieldType))
      .sort((a, b) => Number(b.filterable === true) - Number(a.filterable === true))
      .slice(0, 3),
  );

  /** Date fields get preset dropdowns (Today / Last 7 days / This month). */
  readonly dateFilterFields = computed(() =>
    this.fields()
      .filter((f) => RecordsListComponent.DATE_TYPES.includes(f.fieldType))
      .sort((a, b) => Number(b.filterable === true) - Number(a.filterable === true))
      .slice(0, 2),
  );

  /** Advanced panel rows: text contains, number ranges, custom date spans. */
  readonly advFilterFields = computed(() =>
    this.fields()
      .filter(
        (f) =>
          RecordsListComponent.TEXT_TYPES.includes(f.fieldType) ||
          RecordsListComponent.NUMBER_TYPES.includes(f.fieldType) ||
          RecordsListComponent.DATE_TYPES.includes(f.fieldType),
      )
      .sort((a, b) => Number(b.filterable === true) - Number(a.filterable === true))
      .slice(0, 8),
  );

  advKind(field: FieldResponse): 'text' | 'number' | 'date' {
    if (RecordsListComponent.NUMBER_TYPES.includes(field.fieldType)) return 'number';
    if (RecordsListComponent.DATE_TYPES.includes(field.fieldType)) return 'date';
    return 'text';
  }

  // ---- editor (create only — editing happens on the record detail page) ----
  readonly modalOpen = signal(false);
  readonly aiOpen = signal(false);

  // ---- bulk import (CSV) ----
  readonly importOpen = signal(false);
  readonly importing = signal(false);
  readonly importFile = signal<File | null>(null);
  readonly importResult = signal<BulkUploadResult | null>(null);
  readonly saving = signal(false);
  readonly editorGroup = signal<FormGroup>(new FormGroup({}));

  /** Duplicate warning inside the create editor (phone/email-ish fields). */
  readonly editorDuplicates = signal<{ field: string; hits: { id: string; title: string }[] } | null>(null);
  private duplicateTimer: ReturnType<typeof setTimeout> | null = null;
  readonly exporting = signal(false);

  /** Table columns: the visible fields, capped so wide forms stay readable. */
  readonly columns = computed(() => visibleFields(this.fields()).slice(0, 6));
  readonly hasMoreColumns = computed(() => visibleFields(this.fields()).length > 6);
  readonly editorFields = computed(() => visibleFields(this.fields()));

  constructor() {
    this.loadForms();

    effect(() => {
      const slug = this.slug();
      if (slug) {
        this.loadFormContext(slug);
      } else {
        this.form.set(null);
        this.fields.set([]);
        this.stages.set([]);
      }
    });
  }

  // ------------------------------------------------------------- catalogue

  private loadForms(): void {
    this.formsLoading.set(true);
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

  openForm(form: FormResponse): void {
    this.router.navigate(['/app/records', form.slug]);
  }

  // ----------------------------------------------------------- form context

  private loadFormContext(slug: string): void {
    this.metaLoading.set(true);
    this.metaFailed.set(false);
    this.pageIndex.set(0);
    this.term.set('');
    this.quickFilters.set({});
    this.dateFilters.set({});
    this.advFilters.set({});
    this.advOpen.set(false);
    this.stageFilter.set(null);
    this.createdPreset.set('');
    this.updatedPreset.set('');
    this.localRecords.set([]);

    this.formService.getAll().subscribe({
      next: (forms) => {
        const form = (forms ?? []).find((f) => f.slug === slug) ?? null;
        this.form.set(form);

        if (!form) {
          this.metaFailed.set(true);
          this.metaLoading.set(false);
          return;
        }

        // Fields and stages are independent; a missing stage list must not
        // stop the record table from rendering.
        forkJoin({
          fields: this.fieldService.getByForm(form.id).pipe(catchError(() => of([]))),
          stages: this.stageService.getByForm(form.id).pipe(catchError(() => of([]))),
        }).subscribe({
          next: ({ fields, stages }) => {
            this.fields.set(fields ?? []);
            this.stages.set(stages ?? []);
            this.metaLoading.set(false);
            this.loadRecords();
          },
          error: () => {
            this.metaFailed.set(true);
            this.metaLoading.set(false);
          },
        });
      },
      error: () => {
        this.metaFailed.set(true);
        this.metaLoading.set(false);
      },
    });
  }

  // ---------------------------------------------------------------- records

  loadRecords(): void {
    const slug = this.slug();
    if (!slug) return;

    this.recordsLoading.set(true);
    const term = this.term();

    const filters = this.buildFilters();
    const hasFilters = Object.keys(filters).length > 0;
    const local = this.localMode();
    const fetchPage = local ? 0 : this.pageIndex();
    const fetchSize = local ? RecordsListComponent.LOCAL_FETCH_SIZE : this.pageSize();

    // The search endpoint carries the term/filters; plain listing is cheaper
    // when there is nothing to filter on. Stage/date filters are applied
    // locally on top, over the latest fetched window.
    const request$ =
      term || hasFilters
        ? this.recordService.search(slug, {
            page: fetchPage,
            size: fetchSize,
            sortBy: 'createdAt',
            direction: 'DESC',
            search: term || undefined,
            filters: hasFilters ? filters : undefined,
          })
        : this.recordService.getAll(slug, fetchPage, fetchSize, 'createdAt', 'DESC');

    request$.subscribe({
      next: (page) => {
        const safe = page ?? emptyPage<RecordResponse>(this.pageSize());
        if (local) {
          this.localRecords.set(safe.content ?? []);
        } else {
          this.page.set(safe);
        }
        this.recordsLoading.set(false);
      },
      error: () => {
        this.page.set(emptyPage<RecordResponse>(this.pageSize()));
        this.localRecords.set([]);
        this.recordsLoading.set(false);
      },
    });
  }

  onSearch(term: string): void {
    this.term.set(term);
    this.pageIndex.set(0);
    this.loadRecords();
  }

  /** Dropdown values for a quick filter — booleans get a fixed Yes/No pair. */
  filterOptions(field: FieldResponse): string[] {
    return field.fieldType === FieldType.BOOLEAN ? ['Yes', 'No'] : optionsFor(field);
  }

  onQuickFilter(field: FieldResponse, value: string): void {
    const next = { ...this.quickFilters() };
    if (value) {
      next[field.fieldKey] = value;
    } else {
      delete next[field.fieldKey];
    }
    this.quickFilters.set(next);
    this.applyFilters();
  }

  onDatePreset(field: FieldResponse, preset: string): void {
    const next = { ...this.dateFilters() };
    if (preset) {
      next[field.fieldKey] = preset;
    } else {
      delete next[field.fieldKey];
    }
    this.dateFilters.set(next);
    // A preset overrides any custom span typed for the same field.
    if (preset) this.onAdvChange(field.fieldKey, 'from', '');
    else this.applyFilters();
  }

  onAdvChange(fieldKey: string, prop: 'contains' | 'min' | 'max' | 'from' | 'to', value: string): void {
    const next = { ...this.advFilters() };
    const entry = { ...(next[fieldKey] ?? {}) };
    if (prop === 'from' && value === '') {
      // used as "reset custom span" by onDatePreset
      delete entry.from;
      delete entry.to;
    } else if (value) {
      entry[prop] = value;
    } else {
      delete entry[prop];
    }
    if (Object.keys(entry).length) {
      next[fieldKey] = entry;
    } else {
      delete next[fieldKey];
    }
    this.advFilters.set(next);
    this.applyFilters();
  }

  toggleAdv(): void {
    this.advOpen.update((v) => !v);
  }

  onStageFilter(value: string): void {
    this.stageFilter.set(value === '' ? null : Number(value));
    this.applyFilters();
  }

  onCreatedPreset(value: string): void {
    this.createdPreset.set(value);
    this.applyFilters();
  }

  onUpdatedPreset(value: string): void {
    this.updatedPreset.set(value);
    this.applyFilters();
  }

  clearQuickFilters(): void {
    this.quickFilters.set({});
    this.dateFilters.set({});
    this.advFilters.set({});
    this.stageFilter.set(null);
    this.createdPreset.set('');
    this.updatedPreset.set('');
    this.applyFilters();
  }

  private applyFilters(): void {
    this.pageIndex.set(0);
    this.loadRecords();
  }

  /**
   * Merge every filter source into the exact shapes the backend's search
   * understands: {value} = exact for choice/bool, contains for text;
   * {min,max} = number range; {from,to} = date span (yyyy-MM-dd).
   */
  private buildFilters(): Record<string, unknown> {
    const filters: Record<string, unknown> = {};

    const quick = this.quickFilters();
    for (const field of this.quickFilterFields()) {
      const value = quick[field.fieldKey];
      if (!value) continue;
      filters[field.fieldKey] = {
        value: field.fieldType === FieldType.BOOLEAN ? value === 'Yes' : value,
      };
    }

    const dates = this.dateFilters();
    for (const field of this.dateFilterFields()) {
      const preset = dates[field.fieldKey];
      if (!preset) continue;
      filters[field.fieldKey] = this.presetRange(preset);
    }

    const adv = this.advFilters();
    for (const field of this.advFilterFields()) {
      if (filters[field.fieldKey]) continue; // preset wins over custom span
      const entry = adv[field.fieldKey];
      if (!entry) continue;
      const kind = this.advKind(field);
      if (kind === 'text' && entry.contains?.trim()) {
        filters[field.fieldKey] = { value: entry.contains.trim() };
      } else if (kind === 'number' && (entry.min || entry.max)) {
        const range: Record<string, number> = {};
        if (entry.min && !isNaN(+entry.min)) range['min'] = +entry.min;
        if (entry.max && !isNaN(+entry.max)) range['max'] = +entry.max;
        if (Object.keys(range).length) filters[field.fieldKey] = range;
      } else if (kind === 'date' && (entry.from || entry.to)) {
        const span: Record<string, string> = {};
        if (entry.from) span['from'] = entry.from;
        if (entry.to) span['to'] = entry.to;
        filters[field.fieldKey] = span;
      }
    }
    return filters;
  }

  private presetRange(preset: string): { from: string; to: string } {
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const now = new Date();
    const from = new Date(now);
    if (preset === 'week') from.setDate(now.getDate() - 6);
    if (preset === 'month') from.setDate(1);
    return { from: fmt(from), to: fmt(now) };
  }

  onPageChange(page: number): void {
    this.pageIndex.set(page);
    if (!this.localMode()) this.loadRecords();
  }

  onSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(0);
    this.loadRecords();
  }

  // ------------------------------------------------------------ bulk import

  /**
   * Sample CSV generated from the form's own fields: headers are the field
   * labels (the upload endpoint matches labels or keys) plus one example
   * row per type. Opens straight into Excel.
   */
  downloadSample(): void {
    const fields = this.fields().filter((f) => f.hidden !== true);
    const quote = (v: string) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const example = (f: FieldResponse): string => {
      switch (f.fieldType) {
        case FieldType.NUMBER:
        case FieldType.DECIMAL:
          return '100';
        case FieldType.BOOLEAN:
          return 'yes';
        case FieldType.DATE:
          return '2026-01-31';
        case FieldType.DATETIME:
          return '2026-01-31T10:30';
        case FieldType.EMAIL:
          return 'name@example.com';
        case FieldType.PHONE:
          return '9876543210';
        case FieldType.SELECT:
        case FieldType.RADIO:
          return optionsFor(f)[0] ?? '';
        case FieldType.MULTI_SELECT:
        case FieldType.CHECKBOX:
          return optionsFor(f).slice(0, 2).join(';');
        default:
          return 'Sample ' + f.label;
      }
    };
    const csv =
      fields.map((f) => quote(f.label)).join(',') +
      '\n' +
      fields.map((f) => quote(example(f))).join(',') +
      '\n';
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (this.form()?.slug ?? 'records') + '-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  /** CSV download of everything visible on this form. */
  exportCsv(): void {
    const slug = this.slug();
    if (!slug) return;
    this.exporting.set(true);
    this.recordService.exportCsv(slug).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}-records.csv`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.exporting.set(false),
    });
  }

  /**
   * Debounced duplicate check while creating a record: the first PHONE/EMAIL-ish
   * field that has a value is checked against existing records. A warning only —
   * saving is never blocked.
   */
  checkEditorDuplicates(): void {
    if (this.duplicateTimer) clearTimeout(this.duplicateTimer);
    this.duplicateTimer = setTimeout(() => {
      const slug = this.slug();
      if (!slug || !this.modalOpen()) return;
      const group = this.editorGroup();
      const candidate = this.editorFields().find((f) => {
        const key = (f.fieldKey + ' ' + f.label).toLowerCase();
        const value = group.get(f.fieldKey)?.value;
        return (key.includes('phone') || key.includes('mobile') || key.includes('email'))
          && value != null && String(value).trim() !== '';
      });
      if (!candidate) {
        this.editorDuplicates.set(null);
        return;
      }
      const value = String(group.get(candidate.fieldKey)?.value).trim();
      this.recordService.duplicateCheck(slug, candidate.fieldKey, value).subscribe({
        next: (hits) =>
          this.editorDuplicates.set(hits.length ? { field: candidate.label, hits } : null),
        error: () => this.editorDuplicates.set(null),
      });
    }, 400);
  }

  openImport(): void {
    this.importFile.set(null);
    this.importResult.set(null);
    this.importOpen.set(true);
  }

  onImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importFile.set(input.files?.[0] ?? null);
    this.importResult.set(null);
  }

  runImport(): void {
    const slug = this.slug();
    const file = this.importFile();
    if (!slug || !file || this.importing()) return;
    this.importing.set(true);
    this.recordService.bulkUpload(slug, file).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        if (result.successCount > 0) {
          this.toast.success(
            'Import finished',
            result.successCount + ' record(s) created' +
              (result.failedCount ? ', ' + result.failedCount + ' failed' : ''),
          );
          this.loadRecords();
        }
      },
      error: () => this.importing.set(false),
    });
  }

  closeImport(): void {
    if (!this.importing()) this.importOpen.set(false);
  }

  cell(record: RecordResponse, field: FieldResponse): string {
    return displayValue(field, record.data?.[field.fieldKey]);
  }

  stageOf(record: RecordResponse): StageResponse | null {
    return this.stages().find((s) => s.id === record.stageId) ?? null;
  }

  /** Id of the record whose stage menu is busy, so only that row shows a spinner. */
  readonly movingStageFor = signal<string | null>(null);

  /**
   * Move a record along the pipeline.
   *
   * Re-selecting the current stage is ignored — the backend treats it as a
   * no-op and STAGE_CHANGED automations should not fire on a non-move.
   */
  moveToStage(record: RecordResponse, stage: StageResponse): void {
    if (record.stageId === stage.id || this.movingStageFor()) return;

    const slug = this.slug();
    if (!slug) return;

    this.movingStageFor.set(record.id);
    this.recordService.changeStage(record.id, stage.id).subscribe({
      next: () => {
        this.movingStageFor.set(null);
        this.toast.success('Stage updated', `Moved to ${stage.name}`);
        // Automations may have rewritten fields, so reload rather than patch.
        this.loadRecords();
      },
      error: () => this.movingStageFor.set(null),
    });
  }

  formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
  }

  // ----------------------------------------------------------------- editor

  openCreate(): void {
    this.editorGroup.set(buildFormGroup(this.fields()));
    this.editorDuplicates.set(null);
    this.modalOpen.set(true);
  }

  closeEditor(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  save(): void {
    const group = this.editorGroup();
    if (group.invalid) {
      group.markAllAsTouched();

      // Name the offending fields — "some fields need attention" gives the user
      // nothing to act on when a form has a dozen controls.
      const invalid = this.editorFields()
        .filter((f) => group.get(f.fieldKey)?.invalid)
        .map((f) => f.label);

      this.toast.warning(
        'Check the form',
        invalid.length
          ? `Fix: ${invalid.slice(0, 4).join(', ')}${invalid.length > 4 ? ` and ${invalid.length - 4} more` : ''}.`
          : 'Some fields still need attention.',
      );
      return;
    }

    const slug = this.slug();
    if (!slug) return;

    const data = toRecordData(this.fields(), group.getRawValue());
    this.saving.set(true);

    this.recordService.create(slug, { data }).subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success('Record created');
        this.loadRecords();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(record: RecordResponse): void {
    this.confirm
      .ask({
        title: 'Delete this record?',
        message: 'The record and all of its field values will be permanently removed.',
        confirmText: 'Delete record',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.recordService.delete(record.id).subscribe({
          next: () => {
            this.toast.success('Record deleted');
            this.loadRecords();
          },
        });
      });
  }
}
