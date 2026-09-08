import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';

/**
 * Two steps on one card: ask for the email, then the 6-digit code from that
 * email plus the new password. The backend answers the first step the same
 * way whether or not the account exists.
 */
@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.component.html',
  styleUrl: '../login/login.component.css',
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly themeService = inject(ThemeService);

  readonly theme = this.themeService.theme;
  readonly step = signal<'email' | 'reset'>('email');
  readonly submitting = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly resetForm = this.fb.nonNullable.group({
    otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', Validators.required],
  });

  toggleTheme(): void {
    this.themeService.toggle();
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  sendCode(): void {
    this.serverError.set(null);
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.http
      .post(`${environment.authBaseUrl}/auth/v1/forgot-password`, {
        email: this.emailForm.getRawValue().email.trim(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.step.set('reset');
          this.toast.success('Check your inbox', 'If the account exists, a 6-digit code is on its way.');
        },
        error: (err) => {
          this.submitting.set(false);
          this.serverError.set(
            err?.status === 429
              ? 'Too many requests — wait a few minutes and try again.'
              : 'Could not send the code right now. Please try again.',
          );
        },
      });
  }

  resetPassword(): void {
    this.serverError.set(null);
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const { otp, password, confirm } = this.resetForm.getRawValue();
    if (password !== confirm) {
      this.serverError.set('Passwords do not match.');
      return;
    }

    this.submitting.set(true);
    this.http
      .post(`${environment.authBaseUrl}/auth/v1/reset-password`, {
        email: this.emailForm.getRawValue().email.trim(),
        otp,
        newPassword: password,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.toast.success('Password changed', 'Sign in with your new password.');
          this.router.navigate(['/login'], {
            queryParams: { email: this.emailForm.getRawValue().email.trim() },
          });
        },
        error: (err) => {
          this.submitting.set(false);
          this.serverError.set(
            err?.error?.message ||
              (err?.status === 429
                ? 'Too many attempts — wait a few minutes and try again.'
                : 'Could not reset the password. Request a new code and try again.'),
          );
        },
      });
  }
}
