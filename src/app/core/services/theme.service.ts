import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'xetax.theme';

/**
 * Light/dark switch.
 *
 * The choice is stamped on <html data-theme> — every token override in
 * styles.css hangs off that attribute, so no component needs theme logic.
 * With nothing stored we follow the OS preference.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>('light');
  readonly theme = this._theme.asReadonly();

  constructor() {
    this.apply(this.resolveInitial());
  }

  private resolveInitial(): Theme {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  toggle(): void {
    this.apply(this._theme() === 'dark' ? 'light' : 'dark');
  }

  apply(theme: Theme): void {
    this._theme.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  isDark(): boolean {
    return this._theme() === 'dark';
  }
}
