import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';

interface PublicField {
  label: string;
  fieldKey: string;
  fieldType: string;
  required: boolean | null;
  placeholder: string | null;
  optionsJson: string | null;
}

interface PublicFormInfo {
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  fields: PublicField[];
}

/**
 * The hosted public form (/f/:key) — no login, embeddable via iframe.
 * Plain HttpClient (not CrmApiService) so no auth interceptor redirects
 * an anonymous visitor to /login.
 */
@Component({
  selector: 'app-public-form',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-form.component.html',
  styleUrl: './public-form.component.css',
})
export class PublicFormComponent {
  private readonly http = inject(HttpClient);

  readonly key = input.required<string>();

  readonly info = signal<PublicFormInfo | null>(null);
  readonly notFound = signal(false);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');

  readonly values: Record<string, string> = {};

  constructor() {
    effect(() => {
      const key = this.key();
      if (!key) return;
      this.http
        .get<{ data: PublicFormInfo }>(`${environment.crmBaseUrl}/api/public/forms/${key}`)
        .subscribe({
          next: (res) => this.info.set(res.data),
          error: () => this.notFound.set(true),
        });
    });
  }

  options(field: PublicField): string[] {
    try {
      const parsed = JSON.parse(field.optionsJson || '[]');
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  inputType(field: PublicField): string {
    switch (field.fieldType) {
      case 'EMAIL': return 'email';
      case 'NUMBER':
      case 'PHONE': return 'tel';
      case 'DATE': return 'date';
      default: return 'text';
    }
  }

  submit(): void {
    const info = this.info();
    if (!info) return;
    for (const field of info.fields) {
      if (field.required && !(this.values[field.fieldKey] || '').trim()) {
        this.error.set(`"${field.label}" is required`);
        return;
      }
    }
    this.error.set('');
    const data: Record<string, unknown> = {};
    for (const field of info.fields) {
      const value = (this.values[field.fieldKey] || '').trim();
      if (!value) continue;
      data[field.fieldKey] = field.fieldType === 'NUMBER' ? Number(value) : value;
    }
    this.submitting.set(true);
    this.http
      .post(`${environment.crmBaseUrl}/api/public/forms/${this.key()}/submit`, { data })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.message || 'Something went wrong — please try again.');
        },
      });
  }
}
