import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { WhatsAppConfig, WhatsAppService } from './whatsapp.service';

/**
 * Compact WhatsApp integration status card — embeddable anywhere (profile,
 * dashboards). Shows the live connection state with a path into the full
 * Setup page; disconnect works inline. Fetches quietly so host pages never
 * get error toasts from this widget.
 */
@Component({
  selector: 'app-whatsapp-connect-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card wa-cc">
      <div class="card-header wa-cc__head">
        <span><i class="bi bi-plug me-2"></i>Integrations</span>
      </div>
      <div class="card-body d-flex align-items-center gap-3 py-3">
        <div class="wa-cc__icon" [class.wa-cc__icon--on]="config()?.status === 'CONNECTED'">
          <i class="bi bi-whatsapp"></i>
        </div>

        <div class="flex-grow-1 min-w-0">
          <div class="wa-cc__title">WhatsApp Business</div>
          @if (loading()) {
            <div class="wa-cc__sub text-muted">Checking…</div>
          } @else {
            @switch (config()?.status) {
              @case ('CONNECTED') {
                <div class="wa-cc__sub">
                  <span class="wa-cc__dot wa-cc__dot--on"></span>
                  {{ config()?.displayPhoneNumber }}
                  @if (config()?.verifiedName) {
                    · {{ config()?.verifiedName }}
                  }
                </div>
              }
              @case ('ERROR') {
                <div class="wa-cc__sub text-danger">
                  <span class="wa-cc__dot wa-cc__dot--bad"></span>
                  Connection error — reconnect needed
                </div>
              }
              @default {
                <div class="wa-cc__sub text-muted">
                  <span class="wa-cc__dot"></span>
                  Not connected
                </div>
              }
            }
          }
        </div>

        @if (config()?.status === 'CONNECTED') {
          <div class="d-flex gap-2">
            <a class="btn btn-outline-secondary btn-sm" routerLink="/app/whatsapp">Manage</a>
            <button class="btn btn-outline-danger btn-sm" (click)="disconnect()">
              Disconnect
            </button>
          </div>
        } @else {
          <a class="btn wa-cc__btn btn-sm" routerLink="/app/whatsapp">
            <i class="bi bi-whatsapp me-1"></i>Connect
          </a>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .wa-cc {
        border: 1px solid var(--border-subtle, #e9ecef);
        border-radius: var(--radius-lg, 12px);
        box-shadow: var(--shadow-sm);
      }
      .wa-cc__head {
        background: transparent;
        font-size: 0.875rem;
      }
      .wa-cc__icon {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        background: var(--surface-sunken, #f1f3f5);
        color: var(--text-muted, #6c757d);
      }
      .wa-cc__icon--on {
        background: var(--wa-soft);
        color: var(--wa-600);
        border: 1px solid var(--wa-border);
      }
      .wa-cc__title {
        font-weight: 600;
        font-size: 0.875rem;
      }
      .wa-cc__sub {
        font-size: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.35rem;
        flex-wrap: wrap;
      }
      .wa-cc__dot {
        width: 8px;
        height: 8px;
        flex: 0 0 8px;
        border-radius: 50%;
        background: var(--text-muted, #adb5bd);
      }
      .wa-cc__dot--on {
        background: var(--wa-500);
      }
      .wa-cc__dot--bad {
        background: var(--danger-600, #dc3545);
      }
      .wa-cc__btn {
        background: var(--wa-600);
        border: 1px solid var(--wa-600);
        color: #fff;
        font-weight: 600;
      }
      .wa-cc__btn:hover {
        background: var(--wa-500);
        border-color: var(--wa-500);
        color: #fff;
      }
      .min-w-0 {
        min-width: 0;
      }
    `,
  ],
})
export class WhatsAppConnectCardComponent {
  private readonly whatsapp = inject(WhatsAppService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly config = signal<WhatsAppConfig | null>(null);

  constructor() {
    this.whatsapp.getConfig(true).subscribe({
      next: (config) => {
        this.config.set(config);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  disconnect(): void {
    this.confirm
      .ask({
        title: 'Disconnect WhatsApp?',
        message: 'Messaging and campaigns will stop until you reconnect.',
        confirmText: 'Disconnect',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.whatsapp.disconnect().subscribe({
          next: (config) => {
            this.config.set(config);
            this.toast.success('Disconnected', 'WhatsApp has been disconnected.');
          },
        });
      });
  }
}
