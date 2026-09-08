import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/authentication/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';

/** Cross-field check: the confirmation must equal the password. */
const passwordsMatch = (group: AbstractControl): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return !confirm || password === confirm ? null : { mismatch: true };
};

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly googleUrl = this.auth.googleLoginUrl();
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly themeService = inject(ThemeService);

  readonly theme = this.themeService.theme;
  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email]],
      company: [''],
      phone: ['', Validators.pattern(/^[+0-9()\-\s]{6,14}$/)],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm: ['', Validators.required],
      terms: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatch },
  );

  get name() {
    return this.form.controls.name;
  }
  get email() {
    return this.form.controls.email;
  }
  get phone() {
    return this.form.controls.phone;
  }
  get password() {
    return this.form.controls.password;
  }
  get confirm() {
    return this.form.controls.confirm;
  }
  get terms() {
    return this.form.controls.terms;
  }

  /** Simple strength read-out so the rule is visible while typing. */
  readonly strength = signal(0);

  onPasswordInput(): void {
    const value = this.password.value;
    let score = 0;
    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    this.strength.set(Math.min(score, 4));
  }

  strengthLabel(): string {
    return ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][this.strength()] ?? '';
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

    const raw = this.form.getRawValue();
    this.submitting.set(true);

    this.auth
      .register({
        name: raw.name.trim(),
        email: raw.email.trim(),
        password: raw.password,
        phone: raw.phone.trim() || undefined,
        company: raw.company.trim() || undefined,
      })
      .subscribe({
        next: () => {
          // Sign the new account straight in; if that second call fails the
          // account still exists, so fall back to the login screen.
          this.auth.login({ email: raw.email.trim(), password: raw.password }, true).subscribe({
            next: (user) => {
              this.submitting.set(false);
              this.toast.success(`Welcome, ${user.name.split(' ')[0]}`, 'Your workspace is ready.');
              this.router.navigateByUrl('/app/dashboard');
            },
            error: () => {
              this.submitting.set(false);
              this.toast.success('Account created', 'Please sign in to continue.');
              this.router.navigate(['/login'], { queryParams: { email: raw.email.trim() } });
            },
          });
        },
        error: (err) => {
          this.submitting.set(false);
          this.serverError.set(
            err?.status === 409 || err?.status === 400
              ? 'An account with this email or phone already exists.'
              : err?.status === 401
                ? 'Sign-up is not reachable through the API gateway. See the note below.'
                : 'Could not create your account right now. Please try again.',
          );
        },
      });
  }
}
