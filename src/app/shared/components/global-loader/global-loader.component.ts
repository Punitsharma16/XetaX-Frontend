import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { LoaderService } from '../../../core/services/loader.service';

/** Indeterminate progress bar pinned to the top while any request is in flight. */
@Component({
  selector: 'app-global-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoading()) {
      <div class="global-loader" role="progressbar" aria-label="Loading"></div>
    }
  `,
  styles: [
    `
      .global-loader {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        z-index: 1090;
        background: var(--brand-100);
        overflow: hidden;
      }

      .global-loader::after {
        content: '';
        position: absolute;
        inset: 0;
        width: 40%;
        background: linear-gradient(90deg, var(--brand-400), var(--brand-700));
        animation: loader-slide 1s ease-in-out infinite;
      }

      @keyframes loader-slide {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(350%); }
      }

      @media (prefers-reduced-motion: reduce) {
        .global-loader::after { animation-duration: 2.4s; }
      }
    `,
  ],
})
export class GlobalLoaderComponent {
  readonly isLoading = inject(LoaderService).isLoading;
}
