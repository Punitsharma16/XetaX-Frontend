import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ConfirmService } from '../../../core/services/confirm.service';

/**
 * The single confirmation dialog for the whole app, driven by ConfirmService.
 *
 * Rendered by hand rather than through Bootstrap's JS modal so the open state
 * stays in Angular — no imperative show/hide, no orphaned backdrops.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (state().open) {
      <div class="confirm-backdrop" (click)="respond(false)"></div>

      <div
        class="confirm-shell"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="state().title"
      >
        <div class="confirm-card" (click)="$event.stopPropagation()">
          <div class="confirm-icon" [class.is-danger]="state().variant === 'danger'">
            <i
              class="bi"
              [class.bi-exclamation-triangle-fill]="state().variant === 'danger'"
              [class.bi-question-circle-fill]="state().variant !== 'danger'"
            ></i>
          </div>

          <h5 class="mb-1">{{ state().title }}</h5>
          <p class="text-secondary mb-0">{{ state().message }}</p>

          <div class="d-flex justify-content-end gap-2 mt-4">
            <button type="button" class="btn btn-outline-secondary" (click)="respond(false)">
              {{ state().cancelText }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn-danger]="state().variant === 'danger'"
              [class.btn-primary]="state().variant !== 'danger'"
              (click)="respond(true)"
            >
              {{ state().confirmText }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .confirm-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        z-index: 1070;
        animation: fade-in 140ms ease;
      }

      .confirm-shell {
        position: fixed;
        inset: 0;
        z-index: 1075;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        pointer-events: none;
      }

      .confirm-card {
        pointer-events: auto;
        width: min(420px, 100%);
        background: var(--surface-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
        padding: 1.5rem;
        text-align: center;
        animation: pop-in 160ms ease;
      }

      .confirm-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        margin-bottom: 0.85rem;
        background: var(--brand-50);
        color: var(--brand-600);
      }

      .confirm-icon.is-danger {
        background: var(--danger-50);
        color: var(--danger-600);
      }

      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes pop-in {
        from { opacity: 0; transform: scale(0.96); }
        to { opacity: 1; transform: none; }
      }

      @media (prefers-reduced-motion: reduce) {
        .confirm-backdrop,
        .confirm-card { animation: none; }
      }
    `,
  ],
})
export class ConfirmDialogComponent {
  private readonly confirm = inject(ConfirmService);

  readonly state = this.confirm.state;

  respond(result: boolean): void {
    this.confirm.respond(result);
  }
}
