import { Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** `danger` for destructive actions (delete), `primary` otherwise. */
  variant?: 'danger' | 'primary';
}

interface ConfirmState extends Required<ConfirmOptions> {
  open: boolean;
}

/**
 * App-wide confirmation dialog.
 *
 * A single host component renders the state, so any feature can ask for a
 * confirmation without owning a modal: `confirm.ask({...}).subscribe(ok => ...)`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly _state = signal<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary',
  });

  readonly state = this._state.asReadonly();

  private answer$?: Subject<boolean>;

  ask(options: ConfirmOptions): Observable<boolean> {
    this.answer$?.complete();
    this.answer$ = new Subject<boolean>();

    this._state.set({
      open: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? 'Confirm',
      cancelText: options.cancelText ?? 'Cancel',
      variant: options.variant ?? 'primary',
    });

    return this.answer$.asObservable();
  }

  /** Convenience wrapper for the most common case. */
  confirmDelete(what: string): Observable<boolean> {
    return this.ask({
      title: `Delete ${what}?`,
      message: `This will permanently delete this ${what.toLowerCase()}. This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger',
    });
  }

  respond(result: boolean): void {
    this._state.update((s) => ({ ...s, open: false }));
    this.answer$?.next(result);
    this.answer$?.complete();
    this.answer$ = undefined;
  }
}
