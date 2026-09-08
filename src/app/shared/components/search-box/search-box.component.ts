import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';

/**
 * Debounced search input.
 *
 * Emits only when the term actually settles, so a server-side list is not hit
 * on every keystroke.
 */
@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="input-group search-box" [style.max-width.px]="maxWidth">
      <span class="input-group-text"><i class="bi bi-search"></i></span>
      <input
        type="search"
        class="form-control"
        [formControl]="control"
        [placeholder]="placeholder"
        [attr.aria-label]="placeholder"
      />
      @if (control.value) {
        <button type="button" class="btn btn-outline-secondary" (click)="clear()" aria-label="Clear search">
          <i class="bi bi-x-lg"></i>
        </button>
      }
    </div>
  `,
  styles: [`.search-box { min-width: 200px; }`],
})
export class SearchBoxComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  @Input() placeholder = 'Search…';
  @Input() debounce = 350;
  @Input() maxWidth = 320;

  readonly search = output<string>();
  readonly control = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.control.valueChanges
      .pipe(
        debounceTime(this.debounce),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((value) => this.search.emit(value.trim()));
  }

  clear(): void {
    this.control.setValue('');
  }
}
