import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="err-wrap">
      <div class="err-code">404</div>
      <h1 class="h4 mb-2">Page not found</h1>
      <p class="text-secondary mb-4">
        The page you are looking for does not exist or may have been moved.
      </p>
      <a class="btn btn-primary" routerLink="/app/dashboard">
        <i class="bi bi-house-door"></i> Back to dashboard
      </a>
    </div>
  `,
  styles: [
    `
      .err-wrap {
        max-width: 460px;
        margin: 8vh auto;
        text-align: center;
      }
      .err-code {
        font-size: 4rem;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.04em;
        background: linear-gradient(135deg, var(--brand-500), var(--brand-800));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        margin-bottom: 0.5rem;
      }
    `,
  ],
})
export class NotFoundComponent {}
