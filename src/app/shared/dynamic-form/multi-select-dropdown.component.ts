import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/**
 * A select-style dropdown that holds several values.
 *
 * The closed control looks like the form's other selects and shows the chosen
 * values as chips; opening it lists every option with a tick for the chosen
 * ones. Long option lists get a search box. The value stays a string[], so
 * forms and the backend see exactly what the old checkbox list produced.
 */
@Component({
  selector: 'app-multi-select-dropdown',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="msd" [class.msd--open]="open()">
      <button
        type="button"
        class="form-select msd__control"
        [class.is-invalid]="invalid()"
        [attr.id]="inputId() || null"
        aria-haspopup="listbox"
        [attr.aria-expanded]="open()"
        (click)="toggle()"
        (keydown.escape)="close()"
      >
        @if (value().length) {
          <span class="msd__chips">
            @for (v of value(); track v) {
              <span class="msd__chip">
                {{ v }}
                <span class="msd__chip-x" role="button" tabindex="-1" [attr.aria-label]="'Remove ' + v"
                      (click)="remove(v, $event)">×</span>
              </span>
            }
          </span>
        } @else {
          <span class="msd__placeholder">{{ placeholder() || 'Select…' }}</span>
        }
      </button>

      @if (open()) {
        <div class="msd__panel" (keydown.escape)="close()">
          @if (options().length > 7) {
            <input
              type="search"
              class="form-control form-control-sm msd__search"
              placeholder="Search…"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
            />
          }
          <ul class="msd__list" role="listbox" aria-multiselectable="true">
            @for (option of filtered(); track option) {
              <li
                role="option"
                tabindex="0"
                class="msd__option"
                [class.msd__option--on]="value().includes(option)"
                [attr.aria-selected]="value().includes(option)"
                (click)="pick(option)"
                (keydown.enter)="pick(option); $event.preventDefault()"
                (keydown.space)="pick(option); $event.preventDefault()"
              >
                <span class="msd__tick">@if (value().includes(option)) { <i class="bi bi-check2"></i> }</span>
                {{ option }}
              </li>
            } @empty {
              <li class="msd__empty">No matching options</li>
            }
          </ul>
          @if (value().length) {
            <div class="msd__foot">
              <span>{{ value().length }} selected</span>
              <button type="button" class="btn btn-link btn-sm p-0" (click)="clear()">Clear</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .msd { position: relative; }
    .msd__control {
      text-align: left; min-height: calc(1.5em + 0.75rem + 2px); height: auto;
      display: flex; align-items: center; cursor: pointer;
    }
    .msd__placeholder { color: var(--bs-secondary-color); }
    .msd__chips { display: flex; flex-wrap: wrap; gap: 0.25rem; }
    .msd__chip {
      display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.05rem 0.45rem;
      border-radius: 999px; font-size: 0.75rem; line-height: 1.5;
      background: var(--brand-50, #eef2ff); color: var(--brand-700, #4338ca);
    }
    .msd__chip-x { cursor: pointer; opacity: 0.7; font-size: 0.9rem; line-height: 1; }
    .msd__chip-x:hover { opacity: 1; }
    .msd__panel {
      position: absolute; z-index: 1060; left: 0; right: 0; top: calc(100% + 4px);
      background: var(--bs-body-bg); border: 1px solid var(--bs-border-color);
      border-radius: 0.5rem; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.14); padding: 0.35rem;
    }
    .msd__search { margin-bottom: 0.3rem; }
    .msd__list { list-style: none; margin: 0; padding: 0; max-height: 220px; overflow-y: auto; }
    .msd__option {
      display: flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.45rem;
      border-radius: 0.35rem; cursor: pointer; font-size: 0.85rem;
    }
    .msd__option:hover, .msd__option:focus-visible { background: var(--bs-tertiary-bg); outline: none; }
    .msd__option--on { font-weight: 600; }
    .msd__tick { width: 1rem; color: var(--brand-600, #4f46e5); }
    .msd__empty { padding: 0.4rem; color: var(--bs-secondary-color); font-size: 0.8rem; }
    .msd__foot {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid var(--bs-border-color); margin-top: 0.3rem; padding: 0.3rem 0.35rem 0;
      font-size: 0.75rem; color: var(--bs-secondary-color);
    }
  `],
})
export class MultiSelectDropdownComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly options = input<string[]>([]);
  readonly value = input<string[]>([]);
  readonly placeholder = input<string>('');
  readonly invalid = input(false);
  readonly inputId = input<string>('');

  readonly valueChange = output<string[]>();
  /** Fires when the list closes, so the form can mark the control touched. */
  readonly closed = output<void>();

  readonly open = signal(false);
  readonly query = signal('');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.options().filter((o) => o.toLowerCase().includes(q)) : this.options();
  });

  toggle(): void {
    if (this.open()) this.close();
    else this.open.set(true);
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.query.set('');
    this.closed.emit();
  }

  pick(option: string): void {
    const current = this.value();
    this.valueChange.emit(current.includes(option) ? current.filter((v) => v !== option) : [...current, option]);
  }

  remove(option: string, event: Event): void {
    event.stopPropagation();
    this.valueChange.emit(this.value().filter((v) => v !== option));
  }

  clear(): void {
    this.valueChange.emit([]);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }
}
