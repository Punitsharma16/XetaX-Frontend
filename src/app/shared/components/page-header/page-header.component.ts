import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Consistent page heading: title, subtitle and a slot for page actions. */
@Component({
  selector: 'app-page-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div class="min-w-0">
        <h1 class="page-title d-flex align-items-center gap-2">
          @if (icon) {
            <i class="bi" [class]="icon"></i>
          }
          {{ title }}
        </h1>
        @if (subtitle) {
          <p class="page-subtitle">{{ subtitle }}</p>
        }
      </div>

      <div class="d-flex align-items-center gap-2 flex-wrap">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [`.min-w-0 { min-width: 0; }`],
})
export class PageHeaderComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input() icon?: string;
}
