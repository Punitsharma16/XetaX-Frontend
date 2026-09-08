import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Page control for Spring Data `Page<T>` results.
 *
 * Page numbers are zero-based on the wire and one-based in the UI — the
 * translation lives here so features never juggle both.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 px-3 py-2 border-top border-subtle">
      <div class="text-muted" style="font-size: 0.75rem">
        @if (totalElements() > 0) {
          Showing <strong>{{ from() }}</strong>–<strong>{{ to() }}</strong> of
          <strong>{{ totalElements() }}</strong>
        } @else {
          No results
        }
      </div>

      <div class="d-flex align-items-center gap-2">
        <select
          class="form-select form-select-sm"
          style="width: auto"
          [value]="size()"
          (change)="onSizeChange($event)"
          aria-label="Rows per page"
        >
          @for (option of sizeOptions; track option) {
            <option [value]="option">{{ option }} / page</option>
          }
        </select>

        <div class="btn-group btn-group-sm">
          <button
            type="button"
            class="btn btn-outline-secondary"
            [disabled]="page() === 0"
            (click)="go(0)"
            aria-label="First page"
          >
            <i class="bi bi-chevron-double-left"></i>
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            [disabled]="page() === 0"
            (click)="go(page() - 1)"
            aria-label="Previous page"
          >
            <i class="bi bi-chevron-left"></i>
          </button>

          <span class="btn btn-outline-secondary disabled px-3">
            {{ page() + 1 }} / {{ totalPages() || 1 }}
          </span>

          <button
            type="button"
            class="btn btn-outline-secondary"
            [disabled]="page() + 1 >= totalPages()"
            (click)="go(page() + 1)"
            aria-label="Next page"
          >
            <i class="bi bi-chevron-right"></i>
          </button>
          <button
            type="button"
            class="btn btn-outline-secondary"
            [disabled]="page() + 1 >= totalPages()"
            (click)="go(totalPages() - 1)"
            aria-label="Last page"
          >
            <i class="bi bi-chevron-double-right"></i>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PaginationComponent {
  /** Zero-based page index. */
  readonly page = input.required<number>();
  readonly size = input.required<number>();
  readonly totalElements = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();
  readonly sizeChange = output<number>();

  readonly sizeOptions = [10, 20, 50, 100];

  readonly from = computed(() =>
    this.totalElements() === 0 ? 0 : this.page() * this.size() + 1,
  );

  readonly to = computed(() =>
    Math.min((this.page() + 1) * this.size(), this.totalElements()),
  );

  go(page: number): void {
    if (page < 0 || page >= Math.max(this.totalPages(), 1)) return;
    this.pageChange.emit(page);
  }

  onSizeChange(event: Event): void {
    this.sizeChange.emit(Number((event.target as HTMLSelectElement).value));
  }
}
