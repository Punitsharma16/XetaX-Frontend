import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Consistent page heading: title, subtitle and a slot for page actions. */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-header">
      <div class="page-header-text">
        <h1 class="page-title d-flex align-items-center gap-2">
          @if (icon) {
            <span class="page-header-icon" aria-hidden="true"><i class="bi" [class]="icon"></i></span>
          }
          <span class="page-header-title-text">{{ title }}</span>
        </h1>
        @if (subtitle) {
          <p class="page-subtitle">{{ subtitle }}</p>
        }
      </div>

      <div class="page-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page-header {
        align-items: center;
      }
      .page-header-icon {
        flex: none;
        width: 2rem;
        height: 2rem;
        display: inline-grid;
        place-items: center;
        border-radius: var(--radius-md);
        background: var(--brand-50);
        color: var(--brand-600);
        font-size: 1rem;
      }
      .page-header-title-text {
        min-width: 0;
        overflow-wrap: anywhere;
      }
      .page-actions:empty {
        display: none;
      }
    `,
  ],
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
}
