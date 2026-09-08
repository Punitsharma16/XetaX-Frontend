import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';

/** Renders the toast stack. Mounted once by the root component. */
@Component({
  selector: 'app-toast-container',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-host" role="status" aria-live="polite">
      @for (toast of toasts(); track toast.id) {
        <div class="app-toast" [class]="'app-toast--' + toast.variant">
          <i class="bi" [class]="icon(toast.variant)"></i>
          <div class="app-toast__body">
            <div class="app-toast__title">{{ toast.title }}</div>
            @if (toast.message) {
              <div class="app-toast__message">{{ toast.message }}</div>
            }
          </div>
          <button
            type="button"
            class="app-toast__close"
            aria-label="Dismiss"
            (click)="dismiss(toast.id)"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .toast-host {
        position: fixed;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1080;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: min(420px, calc(100vw - 2rem));
        pointer-events: none;
      }

      .app-toast {
        pointer-events: auto;
        display: flex;
        align-items: flex-start;
        gap: 0.65rem;
        padding: 0.7rem 0.85rem;
        border-radius: var(--radius-lg);
        border: 1px solid var(--border-subtle);
        background: var(--surface-card);
        box-shadow: var(--shadow-lg);
        animation: toast-in 180ms ease;
      }

      .app-toast > .bi {
        font-size: 1rem;
        line-height: 1.35;
      }

      .app-toast--success > .bi { color: var(--success-500); }
      .app-toast--error > .bi { color: var(--danger-500); }
      .app-toast--warning > .bi { color: var(--warning-500); }
      .app-toast--info > .bi { color: var(--info-500); }

      .app-toast--success { border-left: 3px solid var(--success-500); }
      .app-toast--error { border-left: 3px solid var(--danger-500); }
      .app-toast--warning { border-left: 3px solid var(--warning-500); }
      .app-toast--info { border-left: 3px solid var(--info-500); }

      .app-toast__body { flex: 1; min-width: 0; }

      .app-toast__title {
        font-weight: 600;
        font-size: 0.8125rem;
        color: var(--text-primary);
      }

      .app-toast__message {
        font-size: 0.75rem;
        color: var(--text-secondary);
        margin-top: 0.1rem;
        overflow-wrap: anywhere;
      }

      .app-toast__close {
        background: none;
        border: 0;
        color: var(--text-muted);
        font-size: 0.7rem;
        padding: 0.1rem 0.2rem;
        line-height: 1;
        cursor: pointer;
      }

      .app-toast__close:hover { color: var(--text-primary); }

      @keyframes toast-in {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: none; }
      }

      @media (prefers-reduced-motion: reduce) {
        .app-toast { animation: none; }
      }
    `,
  ],
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);

  readonly toasts = this.toastService.toasts;

  icon(variant: Parameters<ToastService['icon']>[0]): string {
    return this.toastService.icon(variant);
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
