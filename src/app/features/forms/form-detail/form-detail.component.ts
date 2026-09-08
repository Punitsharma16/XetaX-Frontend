import { AiPanelComponent } from '../../../shared/components/ai/ai-panel.component';
import { ChangeDetectionStrategy, Component, inject, numberAttribute, input, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FormResponse } from '../../../core/models/crm.model';
import { FieldsPanelComponent } from '../../fields/fields-panel/fields-panel.component';
import { StagesPanelComponent } from '../../stages/stages-panel/stages-panel.component';
import { SharePanelComponent } from '../../publicform/share-panel.component';
import { ErrorStateComponent } from '../../../shared/components/state/state-views.component';
import { FormService } from '../form.service';

type Tab = 'fields' | 'stages' | 'share';

/**
 * Form configuration workspace.
 *
 * `id` arrives from the route via withComponentInputBinding(), so the component
 * needs no ActivatedRoute plumbing.
 */
@Component({
  selector: 'app-form-detail',
  standalone: true,
  imports: [AiPanelComponent, RouterLink, FieldsPanelComponent, StagesPanelComponent, SharePanelComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-detail.component.html',
  styleUrl: './form-detail.component.css',
})
export class FormDetailComponent {
  private readonly formService = inject(FormService);

  /** Route param `:id`. */
  readonly id = input.required({ transform: numberAttribute });

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly aiOpen = signal(false);
  readonly form = signal<FormResponse | null>(null);
  readonly tab = signal<Tab>('fields');

  constructor() {
    effect(() => {
      const id = this.id();
      if (Number.isFinite(id)) this.load(id);
    });
  }

  load(id = this.id()): void {
    this.loading.set(true);
    this.failed.set(false);

    this.formService.getById(id).subscribe({
      next: (form) => {
        this.form.set(form);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  select(tab: Tab): void {
    this.tab.set(tab);
  }
}
