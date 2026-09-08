import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="err-wrap">
      <div class="err-icon"><i class="bi bi-shield-lock"></i></div>
      <h1 class="h4 mb-2">Access denied</h1>
      <p class="text-secondary mb-4">
        Your account does not have permission to open this page. If you believe this
        is a mistake, contact your workspace administrator.
      </p>
      <div class="d-flex gap-2 justify-content-center">
        <button type="button" class="btn btn-outline-secondary" (click)="back()">
          <i class="bi bi-arrow-left"></i> Go back
        </button>
        <a class="btn btn-primary" routerLink="/app/dashboard">
          <i class="bi bi-grid-1x2"></i> Dashboard
        </a>
      </div>
    </div>
  `,
  styles: [
    `
      .err-wrap {
        max-width: 460px;
        margin: 6vh auto;
        text-align: center;
      }
      .err-icon {
        width: 68px;
        height: 68px;
        margin: 0 auto 1rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--warning-50);
        color: var(--warning-600);
        font-size: 1.6rem;
      }
    `,
  ],
})
export class UnauthorizedComponent {
  private readonly location = inject(Location);

  back(): void {
    this.location.back();
  }
}
