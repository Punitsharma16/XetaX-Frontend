import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/authentication/auth.service';
import { TokenResponse } from '../../../core/models/auth.model';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * "Confirm your email" step after sign-up (and for anyone who tries to sign
 * in before confirming). Reached as /verify-email?email=…&sent=1 — `sent`
 * means the register call already mailed a code, so we don't send another.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './verify-email.component.html',
  styleUrl: '../login/login.component.css',
})
export class VerifyEmailComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly themeService = inject(ThemeService);

  readonly theme = this.themeService.theme;
  readonly email = signal(this.route.snapshot.queryParamMap.get('email')?.trim().toLowerCase() ?? '');
  readonly submitting = signal(false);
  readonly resending = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor() {
    if (!this.email()) {
      this.router.navigate(['/register']);
      return;
    }
    if (this.route.snapshot.queryParamMap.get('sent') !== '1') {
      this.resend(true);
    }
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  resend(silent = false): void {
    this.resending.set(true);
    this.http
      .post(`${environment.authBaseUrl}/auth/v1/verify-email/send`, { email: this.email() })
      .subscribe({
        next: () => {
          this.resending.set(false);
          if (!silent) this.toast.success('Code sent', 'Check your inbox (and spam) for a new 6-digit code.');
        },
        error: (err) => {
          this.resending.set(false);
          this.serverError.set(
            err?.status === 429
              ? 'Too many requests — wait a few minutes and try again.'
              : err?.error?.message || 'Could not send the code right now. Please try again.',
          );
        },
      });
  }

  confirm(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.http
      .post<TokenResponse>(`${environment.authBaseUrl}/auth/v1/verify-email/confirm`, {
        email: this.email(),
        otp: this.form.getRawValue().otp,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          const user = this.auth.completeExternalLogin(res.accessToken, res.refreshToken, res.userDto);
          this.toast.success(`Welcome, ${user.name.split(' ')[0]}`, 'Your email is confirmed — your workspace is ready.');
          this.router.navigateByUrl('/app/dashboard');
        },
        error: (err) => {
          this.submitting.set(false);
          this.serverError.set(
            err?.status === 429
              ? 'Too many attempts — wait a few minutes and try again.'
              : err?.error?.message || 'Could not verify the code. Request a new one and try again.',
          );
        },
      });
  }
}
