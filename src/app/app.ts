import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from './core/services/theme.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { GlobalLoaderComponent } from './shared/components/global-loader/global-loader.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

/**
 * Root shell. Hosts the three app-wide surfaces — progress bar, toasts and the
 * confirmation dialog — so no feature has to mount them.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalLoaderComponent, ToastContainerComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-global-loader />
    <router-outlet />
    <app-toast-container />
    <app-confirm-dialog />
  `,
})
export class App {
  // Constructed eagerly so the stored theme is applied before the first paint.
  private readonly theme = inject(ThemeService);
}
