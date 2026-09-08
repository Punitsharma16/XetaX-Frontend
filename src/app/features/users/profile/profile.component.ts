import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/authentication/auth.service';
import { CrmApiService } from '../../../core/services/crm-api.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { UserService } from '../user.service';
import { WhatsAppConnectCardComponent } from '../../whatsapp/whatsapp-connect-card.component';
import { SmtpSettingsCardComponent } from '../smtp-settings-card.component';
import { BillingService, BillingSummary } from '../../billing/billing.service';

/** The slice of /api/dashboard/summary the services card needs. */
interface ServiceStatus {
  whatsapp: { connected: boolean; sent7d: number };
  emailConfigured: boolean;
  agents: number;
}

/** The signed-in user's own account details. */
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    PageHeaderComponent,
    WhatsAppConnectCardComponent,
    SmtpSettingsCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  private readonly userService = inject(UserService);
  private readonly auth = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly api = inject(CrmApiService);
  private readonly billingService = inject(BillingService);

  readonly user = this.auth.user;
  readonly initials = this.auth.initials;
  readonly theme = this.themeService.theme;

  readonly saving = signal(false);
  readonly changingPassword = signal(false);

  /** Both are best-effort — the page works fine while (or if) they never load. */
  readonly billing = signal<BillingSummary | null>(null);
  readonly services = signal<ServiceStatus | null>(null);

  constructor() {
    this.billingService.summary().subscribe({
      next: (s) => this.billing.set(s),
      error: () => {},
    });
    this.api.get<ServiceStatus>('/api/dashboard/summary', undefined, { quiet: true }).subscribe({
      next: (s) => this.services.set(s),
      error: () => {},
    });
  }

  readonly profileForm = this.fb.nonNullable.group({
    name: [this.user()?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    email: [{ value: this.user()?.email ?? '', disabled: true }],
    phone: [this.user()?.phone ?? ''],
    company: [this.user()?.company ?? ''],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', Validators.required],
  });

  toggleTheme(): void {
    this.themeService.toggle();
  }

  saveProfile(): void {
    const current = this.user();
    if (!current || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const raw = this.profileForm.getRawValue();
    this.saving.set(true);

    this.userService
      .update(current.id, {
        name: raw.name.trim(),
        email: current.email,
        phone: raw.phone || undefined,
        company: raw.company || undefined,
        isEnable: true,
        isAdmin: current.isAdmin,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Profile updated', 'Sign in again to refresh your session details.');
        },
        error: () => this.saving.set(false),
      });
  }

  changePassword(): void {
    const current = this.user();
    if (!current || this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { password, confirm } = this.passwordForm.getRawValue();
    if (password !== confirm) {
      this.toast.warning('Passwords do not match', 'Re-enter the confirmation.');
      return;
    }

    this.changingPassword.set(true);
    this.userService
      .update(current.id, {
        name: current.name,
        email: current.email,
        password,
        isEnable: true,
        isAdmin: current.isAdmin,
      })
      .subscribe({
        next: () => {
          this.changingPassword.set(false);
          this.passwordForm.reset({ password: '', confirm: '' });
          this.toast.success('Password changed', 'Use the new password next time you sign in.');
        },
        error: () => this.changingPassword.set(false),
      });
  }
}
