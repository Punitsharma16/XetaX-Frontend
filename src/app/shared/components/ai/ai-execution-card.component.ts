import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type AiStepState = 'pending' | 'running' | 'completed' | 'failed';

export interface AiExecutionStep {
  label: string;
  state: AiStepState;
}

/**
 * Reusable AI execution/status card.
 *
 * Renders a titled card with a step list (pending / running / completed /
 * failed) — used by the AI workspace while a request is in flight and ready
 * for real per-tool events when the backend starts emitting them. Never put
 * internal ids or metadata in step labels; they are user-facing.
 */
@Component({
  selector: 'app-ai-execution-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ai-exec" [class.ai-exec--failed]="failed">
      <div class="ai-exec__title">
        <span class="ai-exec__spark"><i class="bi bi-stars"></i></span>
        <span class="text-truncate">{{ title }}</span>
      </div>
      @if (subtitle) {
        <div class="ai-exec__subtitle text-truncate">{{ subtitle }}</div>
      }
      <div class="ai-exec__steps">
        @for (step of steps; track step.label) {
          <div class="ai-exec__step" [attr.data-state]="step.state">
            @switch (step.state) {
              @case ('completed') {
                <i class="bi bi-check-circle-fill ai-exec__icon ai-exec__icon--done"></i>
              }
              @case ('running') {
                <span class="ai-exec__icon spinner-border spinner-border-sm" role="status"></span>
              }
              @case ('failed') {
                <i class="bi bi-x-circle-fill ai-exec__icon ai-exec__icon--failed"></i>
              }
              @default {
                <i class="bi bi-circle ai-exec__icon ai-exec__icon--pending"></i>
              }
            }
            <span class="ai-exec__label">{{ step.label }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .ai-exec {
        border: 1px solid var(--brand-200, #c7d2fe);
        background: color-mix(in srgb, var(--brand-50, #eef2ff) 55%, var(--bs-body-bg, #fff));
        border-radius: var(--radius-lg, 10px);
        padding: 0.85rem 1rem;
        max-width: 420px;
      }
      .ai-exec--failed {
        border-color: var(--bs-danger-border-subtle, #f1aeb5);
      }
      .ai-exec__title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        font-size: 0.85rem;
      }
      .ai-exec__spark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        flex: 0 0 24px;
        border-radius: 8px;
        background: var(--brand-600, #4f46e5);
        color: #fff;
        font-size: 0.75rem;
      }
      .ai-exec__subtitle {
        font-size: 0.75rem;
        color: var(--bs-secondary-color, #6c757d);
        margin: 0.15rem 0 0 calc(24px + 0.5rem);
      }
      .ai-exec__steps {
        margin: 0.6rem 0 0 calc(24px + 0.5rem);
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .ai-exec__step {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
      }
      .ai-exec__step[data-state='pending'] .ai-exec__label {
        color: var(--bs-secondary-color, #6c757d);
      }
      .ai-exec__icon {
        width: 16px;
        flex: 0 0 16px;
        font-size: 0.85rem;
        text-align: center;
      }
      .ai-exec__icon--done {
        color: var(--bs-success, #198754);
      }
      .ai-exec__icon--failed {
        color: var(--bs-danger, #dc3545);
      }
      .ai-exec__icon--pending {
        color: var(--bs-secondary-color, #adb5bd);
      }
      .spinner-border-sm {
        --bs-spinner-width: 0.85rem;
        --bs-spinner-height: 0.85rem;
        --bs-spinner-border-width: 0.14em;
        color: var(--brand-600, #4f46e5);
      }
    `,
  ],
})
export class AiExecutionCardComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() steps: AiExecutionStep[] = [];
  @Input() failed = false;
}
