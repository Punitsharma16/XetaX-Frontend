import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CrmApiService } from '../../core/services/crm-api.service';
import { ToastService } from '../../core/services/toast.service';

interface SmtpStatus {
  configured: boolean;
  host: string | null;
  port: number | null;
  username: string | null;
  canEdit: boolean;
}

/**
 * Profile-embedded email (SMTP) settings card. The org admin adds their own
 * SMTP here (Gmail app-password etc.) — meeting invites and SEND_EMAIL
 * automations use it. Password is write-only: never echoed back by the API.
 */
@Component({
  selector: 'app-smtp-settings-card',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card mt-3">
      <div class="card-header d-flex align-items-center justify-content-between">
        <span><i class="bi bi-envelope-at me-2"></i>Email (SMTP)</span>
        @if (status()?.configured) {
          <span class="badge badge-soft-primary">Configured</span>
        } @else {
          <span class="badge badge-soft-muted">Not set</span>
        }
      </div>
      <div class="card-body">
        @if (loading()) {
          <div class="text-muted" style="font-size: 0.8rem">Checking…</div>
        } @else if (!status()?.canEdit) {
          <p class="text-muted mb-0" style="font-size: 0.8rem">
            <i class="bi bi-info-circle me-1"></i>Only the organisation admin can change email settings.
            @if (status()?.configured) {
              Emails are currently sent from <b>{{ status()?.username }}</b>.
            } @else {
              Ask your admin to configure SMTP.
            }
          </p>
        } @else {
          <p class="text-muted" style="font-size: 0.75rem">
            Meeting invites and email automations are sent from this account. For Gmail:
            host <code>smtp.gmail.com</code>, port <code>587</code>, and use an
            <b>App&nbsp;Password</b> as the password (Google Account → Security → App passwords).
          </p>

          <div class="row g-2">
            <div class="col-12 col-md-6">
              <label class="form-label" for="smtpHost">SMTP host</label>
              <input id="smtpHost" class="form-control form-control-sm" [(ngModel)]="host"
                     placeholder="smtp.gmail.com" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label" for="smtpPort">Port</label>
              <input id="smtpPort" type="number" class="form-control form-control-sm"
                     [(ngModel)]="port" placeholder="587" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label" for="smtpUser">Email / username</label>
              <input id="smtpUser" class="form-control form-control-sm" [(ngModel)]="username"
                     placeholder="you@gmail.com" autocomplete="off" />
            </div>
            <div class="col-12 col-md-6">
              <label class="form-label" for="smtpPass">Password / app password</label>
              <input id="smtpPass" type="password" class="form-control form-control-sm"
                     [(ngModel)]="password" autocomplete="new-password"
                     [placeholder]="status()?.configured ? '•••••••• (leave blank to keep the current one)' : ''" />
            </div>
          </div>

          <div class="d-flex align-items-center gap-2 mt-3 flex-wrap">
            <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="save()">
              @if (saving()) { <span class="spinner-border spinner-border-sm me-1"></span> }
              @else { <i class="bi bi-check2 me-1"></i> }
              Save
            </button>
            @if (status()?.configured) {
              <button type="button" class="btn btn-outline-secondary btn-sm" [disabled]="testing()"
                      (click)="sendTest()">
                @if (testing()) { <span class="spinner-border spinner-border-sm me-1"></span> }
                @else { <i class="bi bi-send me-1"></i> }
                Send test email
              </button>
              <button type="button" class="btn btn-outline-danger btn-sm" (click)="remove()">
                <i class="bi bi-trash me-1"></i>Remove
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class SmtpSettingsCardComponent implements OnInit {
  private readonly api = inject(CrmApiService);
  private readonly toast = inject(ToastService);

  readonly status = signal<SmtpStatus | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly testing = signal(false);

  host = '';
  port: number | null = 587;
  username = '';
  password = '';

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.api.get<SmtpStatus>('/api/settings/smtp', undefined, { quiet: true }).subscribe({
      next: (s) => {
        this.status.set(s);
        this.host = s.host ?? '';
        this.port = s.port ?? 587;
        this.username = s.username ?? '';
        this.password = '';
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    if (!this.host.trim() || !this.username.trim()) {
      this.toast.warning('Host and email/username are required', 'Gmail: smtp.gmail.com + app password.');
      return;
    }
    this.saving.set(true);
    this.api
      .put<SmtpStatus>('/api/settings/smtp', {
        host: this.host.trim(),
        port: this.port ?? 587,
        username: this.username.trim(),
        password: this.password,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Email settings saved', 'Send a test email to verify.');
          this.refresh();
        },
        error: () => this.saving.set(false),
      });
  }

  sendTest(): void {
    this.testing.set(true);
    this.api
      .post<{ sent: boolean; error?: string }>('/api/settings/smtp/test', { to: this.username.trim() })
      .subscribe({
        next: (r) => {
          this.testing.set(false);
          if (r.sent) this.toast.success('Test email sent', `Check the inbox of ${this.username}.`);
          else this.toast.warning('Email did not go through', r.error || 'Check the host/password.');
        },
        error: () => this.testing.set(false),
      });
  }

  remove(): void {
    this.api.delete('/api/settings/smtp').subscribe({
      next: () => {
        this.toast.success('SMTP removed', 'The default system email (if configured) will be used.');
        this.refresh();
      },
    });
  }
}
