import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * The three states every data view needs, as small standalone pieces so a
 * feature never hand-rolls its own "no data" markup.
 */

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <div class="empty-state-icon empty-icon" aria-hidden="true">
        <i class="bi" [class]="icon"></i>
      </div>
      <h6 class="empty-state-title">{{ title }}</h6>
      @if (message) {
        <p class="empty-state-text">{{ message }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class EmptyStateComponent {
  @Input() icon = 'bi-inbox';
  @Input() title = 'Nothing here yet';
  @Input() message?: string;
}

@Component({
  selector: 'app-error-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state" role="alert">
      <div class="empty-state-icon error-icon" aria-hidden="true"><i class="bi bi-exclamation-octagon"></i></div>
      <h6 class="empty-state-title">{{ title }}</h6>
      <p class="empty-state-text mb-2">{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .error-icon {
        background: var(--danger-50);
        color: var(--danger-600);
      }
    `,
  ],
})
export class ErrorStateComponent {
  @Input() title = 'Could not load this data';
  @Input() message = 'Something went wrong while talking to the server.';
}

/** Skeleton rows sized to a table, so loading does not collapse the layout. */
@Component({
  selector: 'app-table-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-3" aria-busy="true" aria-live="polite">
      @for (row of rowsArray; track $index) {
        <div class="d-flex align-items-center gap-3 py-2">
          @for (col of colsArray; track $index) {
            <div class="skeleton flex-fill" style="height: 12px"></div>
          }
        </div>
      }
    </div>
  `,
})
export class TableSkeletonComponent {
  @Input() set rows(value: number) {
    this.rowsArray = Array.from({ length: value });
  }

  @Input() set cols(value: number) {
    this.colsArray = Array.from({ length: value });
  }

  rowsArray: unknown[] = Array.from({ length: 6 });
  colsArray: unknown[] = Array.from({ length: 5 });
}
