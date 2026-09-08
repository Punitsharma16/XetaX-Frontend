import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { StageResponse, StageStatus } from '../../../core/models/crm.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  EmptyStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { StageService } from '../stage.service';

const STAGE_COLORS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#64748b',
];

@Component({
  selector: 'app-stages-panel',
  standalone: true,
  imports: [ReactiveFormsModule, ModalComponent, EmptyStateComponent, TableSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stages-panel.component.html',
  styleUrl: './stages-panel.component.css',
})
export class StagesPanelComponent {
  private readonly stageService = inject(StageService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly formId = input.required<number>();

  readonly colors = STAGE_COLORS;
  readonly statuses = Object.values(StageStatus);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly stages = signal<StageResponse[]>([]);

  readonly modalOpen = signal(false);
  readonly editing = signal<StageResponse | null>(null);
  private codeTouched = false;

  readonly editorForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(80)]],
    code: ['', [Validators.required, Validators.pattern(/^[A-Z][A-Z0-9_]*$/)]],
    color: ['#4f46e5'],
    sequence: [1, [Validators.required, Validators.min(1)]],
    isDefault: [false],
    isFinal: [false],
    status: [StageStatus.ACTIVE, Validators.required],
  });

  constructor() {
    effect(() => {
      const id = this.formId();
      if (id) this.load(id);
    });
  }

  load(formId = this.formId()): void {
    this.loading.set(true);
    this.stageService.getByForm(formId).subscribe({
      next: (stages) => {
        this.stages.set(stages ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.stages.set([]);
        this.loading.set(false);
      },
    });
  }

  // ---------------------------------------------------------------- editor

  openCreate(): void {
    this.editing.set(null);
    this.codeTouched = false;
    const nextSequence = this.stages().length
      ? Math.max(...this.stages().map((s) => s.sequence ?? 0)) + 1
      : 1;

    this.editorForm.reset({
      name: '',
      code: '',
      color: STAGE_COLORS[this.stages().length % STAGE_COLORS.length],
      sequence: nextSequence,
      // The first stage of a pipeline is the natural default.
      isDefault: this.stages().length === 0,
      isFinal: false,
      status: StageStatus.ACTIVE,
    });
    this.modalOpen.set(true);
  }

  openEdit(stage: StageResponse): void {
    this.editing.set(stage);
    this.codeTouched = true;
    this.editorForm.reset({
      name: stage.name,
      code: stage.code,
      color: stage.color || '#4f46e5',
      sequence: stage.sequence ?? 1,
      isDefault: stage.isDefault ?? false,
      isFinal: stage.isFinal ?? false,
      status: stage.status ?? StageStatus.ACTIVE,
    });
    this.modalOpen.set(true);
  }

  closeEditor(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  onNameInput(): void {
    if (this.codeTouched) return;
    this.editorForm.controls.code.setValue(StageService.toCode(this.editorForm.controls.name.value));
  }

  onCodeInput(): void {
    this.codeTouched = true;
  }

  pickColor(color: string): void {
    this.editorForm.controls.color.setValue(color);
  }

  save(): void {
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }

    const payload = this.editorForm.getRawValue();
    const current = this.editing();
    this.saving.set(true);

    const request$ = current
      ? this.stageService.update(current.id, payload)
      : this.stageService.create(this.formId(), payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Stage updated' : 'Stage created', payload.name);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(stage: StageResponse): void {
    this.confirm
      .ask({
        title: `Delete "${stage.name}"?`,
        message: 'Records currently sitting in this stage will lose their stage assignment.',
        confirmText: 'Delete stage',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.stageService.delete(stage.id).subscribe({
          next: () => {
            this.toast.success('Stage deleted', stage.name);
            this.load();
          },
        });
      });
  }

  /** Swaps `sequence` with the neighbour — ordering is a plain stage update. */
  move(stage: StageResponse, direction: -1 | 1): void {
    const list = this.stages();
    const index = list.findIndex((s) => s.id === stage.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;

    const other = list[target];
    const toRequest = (s: StageResponse, sequence: number) => ({
      name: s.name,
      code: s.code,
      color: s.color,
      sequence,
      isDefault: s.isDefault,
      isFinal: s.isFinal,
      status: s.status,
    });

    this.stageService.update(stage.id, toRequest(stage, other.sequence ?? target + 1)).subscribe({
      next: () =>
        this.stageService
          .update(other.id, toRequest(other, stage.sequence ?? index + 1))
          .subscribe({ next: () => this.load(), error: () => this.load() }),
      error: () => this.load(),
    });
  }
}
