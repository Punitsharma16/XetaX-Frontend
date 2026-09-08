import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CrmApiService } from '../../core/services/crm-api.service';
import { ToastService } from '../../core/services/toast.service';

interface ShareSettings {
  enabled: boolean;
  publicKey?: string;
  formUrl?: string;
  webhookUrl?: string;
}

/**
 * "Share & Webhook" tab on the form page: public hosted form (link + iframe
 * embed) and the incoming webhook URL — any website/tool can POST JSON here
 * and it becomes a record (default stage, automations fire, bell rings).
 */
@Component({
  selector: 'app-share-panel',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-panel.component.html',
  styleUrl: './share-panel.component.css',
})
export class SharePanelComponent {
  private readonly api = inject(CrmApiService);
  private readonly toast = inject(ToastService);

  readonly formId = input.required<number>();

  readonly settings = signal<ShareSettings | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  constructor() {
    effect(() => {
      const id = this.formId();
      if (id) this.load(id);
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.api.get<ShareSettings>(`/api/forms/${id}/share`, undefined, { quiet: true }).subscribe({
      next: (s) => {
        this.settings.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  toggle(): void {
    const current = this.settings();
    this.update({ enabled: !current?.enabled });
  }

  regenerate(): void {
    this.update({ regenerateKey: true, enabled: true });
  }

  private update(body: { enabled?: boolean; regenerateKey?: boolean }): void {
    this.saving.set(true);
    this.api.put<ShareSettings>(`/api/forms/${this.formId()}/share`, body).subscribe({
      next: (s) => {
        this.settings.set(s);
        this.saving.set(false);
        this.toast.success(s.enabled ? 'Public form is ON' : 'Public form is off');
      },
      error: () => this.saving.set(false),
    });
  }

  iframeSnippet(): string {
    const url = this.settings()?.formUrl ?? '';
    return `<iframe src="${url}" style="width:100%;max-width:560px;height:640px;border:0;border-radius:12px" title="Enquiry form"></iframe>`;
  }

  curlSnippet(): string {
    const url = this.settings()?.webhookUrl ?? '';
    return `curl -X POST '${url}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"full_name":"Ravi","phone_number":"9876543210"}'`;
  }

  copy(text: string, label: string): void {
    navigator.clipboard?.writeText(text).then(
      () => this.toast.success(`${label} copied`),
      () => this.toast.warning('Copy failed — please select it manually'),
    );
  }
}
