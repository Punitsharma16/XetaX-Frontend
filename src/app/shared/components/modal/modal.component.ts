import { ChangeDetectionStrategy, Component, HostListener, input, output } from '@angular/core';

/**
 * Reusable modal.
 *
 * Rendered by Angular rather than Bootstrap's JS API so visibility stays a
 * plain input — no imperative show/hide, and no backdrop can outlive the
 * component that opened it.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div class="app-modal__backdrop" (click)="dismiss()"></div>

      <div class="app-modal" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <div class="app-modal__dialog" [class]="'app-modal__dialog--' + size()">
          <div class="app-modal__content">
            <div class="app-modal__header">
              <h5 class="mb-0 d-flex align-items-center gap-2">
                @if (icon()) {
                  <i class="bi" [class]="icon()"></i>
                }
                {{ title() }}
              </h5>
              <button type="button" class="btn-close" aria-label="Close" (click)="dismiss()"></button>
            </div>

            <div class="app-modal__body">
              <ng-content></ng-content>
            </div>

            <div class="app-modal__footer">
              <ng-content select="[modalFooter]"></ng-content>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .app-modal__backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        z-index: 1050;
        animation: modal-fade 140ms ease;
      }

      .app-modal {
        position: fixed;
        inset: 0;
        z-index: 1055;
        overflow-y: auto;
        padding: 1.5rem 1rem;
        pointer-events: none;
      }

      .app-modal__dialog {
        pointer-events: auto;
        margin: 0 auto;
        width: 100%;
        max-width: 520px;
        animation: modal-rise 160ms ease;
      }

      .app-modal__dialog--sm { max-width: 400px; }
      .app-modal__dialog--lg { max-width: 720px; }
      .app-modal__dialog--xl { max-width: 960px; }

      .app-modal__content {
        background: var(--surface-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-xl);
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        max-height: calc(100vh - 3rem);
      }

      .app-modal__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--border-subtle);
      }

      .app-modal__body {
        padding: 1.25rem;
        overflow-y: auto;
      }

      .app-modal__footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.5rem;
        padding: 0.875rem 1.25rem;
        border-top: 1px solid var(--border-subtle);
      }

      .app-modal__footer:empty { display: none; }

      @keyframes modal-fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes modal-rise {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: none; }
      }

      @media (prefers-reduced-motion: reduce) {
        .app-modal__backdrop,
        .app-modal__dialog { animation: none; }
      }
    `,
  ],
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input('');
  readonly icon = input<string | undefined>(undefined);
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  /** Set false for flows that must not be dismissed by backdrop/Escape. */
  readonly dismissible = input(true);

  readonly closed = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.dismiss();
  }

  dismiss(): void {
    if (this.dismissible()) this.closed.emit();
  }
}
