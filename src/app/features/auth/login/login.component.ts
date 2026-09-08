import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/authentication/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly themeService = inject(ThemeService);

  /** Google sign-in — a plain navigation, the backend does the OAuth dance. */
  readonly googleUrl = this.auth.googleLoginUrl();


  readonly theme = this.themeService.theme;
  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(4)]],
    remember: [true],
  });

  constructor() {
    // ?oauth=failed|disabled — the backend bounced a Google attempt back here.
    const why = this.route.snapshot.queryParamMap.get('oauth');
    if (why === 'failed') this.serverError.set('Google sign-in did not complete. Please try again.');
    if (why === 'disabled') this.serverError.set('This account is disabled. Contact your workspace owner.');

    // Signup hands the address over when auto-login could not complete.
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) this.form.controls.email.setValue(email);
  }

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  toggleTheme(): void {
    this.themeService.toggle();
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  submit(): void {
    this.serverError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.form.getRawValue();
    this.submitting.set(true);

    this.auth.login({ email: email.trim(), password }, remember).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.toast.success(`Welcome back, ${user.name.split(' ')[0]}`);

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || '/app/dashboard');
      },
      error: (err) => {
        this.submitting.set(false);
        if (err?.status === 403 && err?.error?.message === 'EMAIL_NOT_VERIFIED') {
          this.toast.info('Confirm your email first', 'We just sent you a fresh code.');
          this.router.navigate(['/verify-email'], { queryParams: { email: email.trim().toLowerCase() } });
          return;
        }
        // Credential failures are shown inline; the interceptor already
        // toasted the transport-level detail.
        this.serverError.set(
          err?.status === 401 || err?.status === 403
            ? 'Incorrect email or password.'
            : 'Unable to sign in right now. Please try again.',
        );
      },
    });
  }
}
