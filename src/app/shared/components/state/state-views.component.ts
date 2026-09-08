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
    <div class="text-center py-5 px-3">
      <div class="empty-icon">
        <i class="bi" [class]="icon"></i>
      </div>
      <h6 class="mt-3 mb-1">{{ title }}</h6>
      @if (message) {
        <p class="text-muted mb-0" style="font-size: 0.8125rem">{{ message }}</p>
      }
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .empty-icon {
        width: 56px;
        height: 56px;
        margin: 0 auto;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--surface-sunken);
        color: var(--text-muted);
        font-size: 1.4rem;
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
    <div class="text-center py-5 px-3">
      <div class="error-icon"><i class="bi bi-exclamation-octagon"></i></div>
      <h6 class="mt-3 mb-1">{{ title }}</h6>
      <p class="text-muted mb-3" style="font-size: 0.8125rem">{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .error-icon {
        width: 56px;
        height: 56px;
        margin: 0 auto;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--danger-50);
        color: var(--danger-600);
        font-size: 1.4rem;
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
    <div class="p-3">
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
