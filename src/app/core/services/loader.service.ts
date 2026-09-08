import { Injectable, computed, signal } from '@angular/core';

/**
 * Global request counter behind the top progress bar.
 *
 * Counting (rather than a boolean) keeps parallel requests honest: the bar
 * hides only when the last in-flight call settles.
 */
@Injectable({ providedIn: 'root' })
export class LoaderService {
  private readonly pending = signal(0);

  readonly isLoading = computed(() => this.pending() > 0);

  start(): void {
    this.pending.update((n) => n + 1);
  }

  stop(): void {
    this.pending.update((n) => Math.max(0, n - 1));
  }

  reset(): void {
    this.pending.set(0);
  }
}
