import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
  /** Auto-dismiss delay in ms; 0 keeps the toast until dismissed. */
  duration: number;
}

const ICONS: Record<ToastVariant, string> = {
  success: 'bi-check-circle-fill',
  error: 'bi-x-octagon-fill',
  warning: 'bi-exclamation-triangle-fill',
  info: 'bi-info-circle-fill',
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private readonly _toasts = signal<Toast[]>([]);

  readonly toasts = this._toasts.asReadonly();

  icon(variant: ToastVariant): string {
    return ICONS[variant];
  }

  success(title: string, message?: string): void {
    this.push('success', title, message);
  }

  error(title: string, message?: string): void {
    // Errors linger longer — they usually carry something to read.
    this.push('error', title, message, 7000);
  }

  warning(title: string, message?: string): void {
    this.push('warning', title, message, 6000);
  }

  info(title: string, message?: string): void {
    this.push('info', title, message);
  }

  dismiss(id: number): void {
    this._toasts.update((list) => list.filter((t) => t.id !== id));
  }

  clear(): void {
    this._toasts.set([]);
  }

  private push(variant: ToastVariant, title: string, message?: string, duration = 4500): void {
    const toast: Toast = { id: this.nextId++, variant, title, message, duration };
    this._toasts.update((list) => [...list, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast.id), duration);
    }
  }
}
