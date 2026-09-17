import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CrmApiService } from '../../core/services/crm-api.service';
import { ToastService } from '../../core/services/toast.service';
import type { RateSummary } from '../whatsapp/whatsapp.service';

interface DigestSettings {
  enabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  canEdit: boolean;
  emailReady: boolean;
  phoneOnProfile: boolean;
  whatsappConnected: boolean;
}

/**
 * Profile card for the 9 AM morning digest. The bell has no switch: while the
 * digest is on it always shows there. Email and WhatsApp can be turned off
 * separately, or the whole digest can be.
 */
@Component({
  selector: 'app-digest-settings-card',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card mt-3">
      <div class="card-header d-flex align-items-center justify-content-between">
        <span><i class="bi bi-sunrise me-2"></i>Morning digest</span>
        @if (settings(); as s) {
          @if (s.enabled) {
            <span class="badge badge-soft-primary">On</span>
          } @else {
            <span class="badge badge-soft-muted">Off</span>
          }
        }
      </div>
      <div class="card-body">
        @if (loading()) {
          <div class="text-muted" style="font-size: 0.8rem">Checking…</div>
        } @else if (settings(); as s) {
          <p class="text-muted" style="font-size: 0.75rem">
            Every day at 9:00 AM: leads untouched for 3+ days, WhatsApp chats waiting for a reply,
            and tasks due today. While it is on, it always appears in your notification bell.
          </p>

          @if (!s.canEdit) {
            <p class="text-muted mb-0" style="font-size: 0.8rem">
              <i class="bi bi-info-circle me-1"></i>The morning digest goes to the workspace owner.
              Only they can change where it is sent.
            </p>
          } @else {
            <div class="form-check form-switch mb-2">
              <input id="digestOn" class="form-check-input" type="checkbox" [(ngModel)]="enabled" />
              <label class="form-check-label fw-semibold" for="digestOn">Send me the morning digest</label>
            </div>

            <div class="ps-1" [class.opacity-50]="!enabled">
              <div class="form-check form-switch mb-1">
                <input id="digestEmail" class="form-check-input" type="checkbox"
                       [(ngModel)]="emailEnabled" [disabled]="!enabled" />
                <label class="form-check-label" for="digestEmail">Also email it to me</label>
              </div>
              @if (!s.emailReady) {
                <div class="form-text mb-2 ms-4">Add your email (SMTP) above first — until then nothing is emailed.</div>
              }

              <div class="form-check form-switch mb-1 mt-2">
                <input id="digestWhatsapp" class="form-check-input" type="checkbox"
                       [(ngModel)]="whatsappEnabled" [disabled]="!enabled" />
                <label class="form-check-label" for="digestWhatsapp">Also send it on WhatsApp</label>
              </div>
              <div class="form-text ms-4">
                Goes to the phone number on your profile. WhatsApp only delivers it if you messaged
                your business number in the last 24 hours.
                <br /><i class="bi bi-currency-rupee"></i>From 1 October 2026, Meta charges for each
                WhatsApp digest (at the utility rate@if (replyRate(); as rate) {, about ₹{{ rate | number: '1.2-4' }} per message}).
                @if (!s.phoneOnProfile) { <br />Add a phone number to your profile first. }
                @if (!s.whatsappConnected) { <br />Connect WhatsApp first. }
              </div>
            </div>

            <button type="button" class="btn btn-primary btn-sm mt-3" [disabled]="saving()" (click)="save()">
              @if (saving()) { <span class="spinner-border spinner-border-sm me-1"></span> }
              @else { <i class="bi bi-check2 me-1"></i> }
              Save
            </button>
          }
        }
      </div>
    </div>
  `,
})
export class DigestSettingsCardComponent implements OnInit {
  private readonly api = inject(CrmApiService);
  private readonly toast = inject(ToastService);

  readonly settings = signal<DigestSettings | null>(null);
  /** Meta's India price for one digest message, when the rate card could be read. */
  readonly replyRate = signal<number | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);

  enabled = true;
  emailEnabled = true;
  whatsappEnabled = true;

  ngOnInit(): void {
    this.api.get<RateSummary>('/api/whatsapp/rates', undefined, { quiet: true }).subscribe({
      next: (rates) => this.replyRate.set(rates?.categories?.SERVICE?.rate ?? null),
      error: () => this.replyRate.set(null),
    });
    this.api.get<DigestSettings>('/api/settings/digest', undefined, { quiet: true }).subscribe({
      next: (s) => this.apply(s),
      error: () => this.loading.set(false),
    });
  }

  save(): void {
    this.saving.set(true);
    this.api
      .put<DigestSettings>('/api/settings/digest', {
        enabled: this.enabled,
        emailEnabled: this.emailEnabled,
        whatsappEnabled: this.whatsappEnabled,
      })
      .subscribe({
        next: (s) => {
          this.saving.set(false);
          this.apply(s);
          this.toast.success(
            'Morning digest saved',
            s.enabled ? 'Applies from the next 9:00 AM digest.' : 'You will not receive the morning digest.',
          );
        },
        error: () => this.saving.set(false),
      });
  }

  private apply(s: DigestSettings): void {
    this.settings.set(s);
    this.enabled = s.enabled;
    this.emailEnabled = s.emailEnabled;
    this.whatsappEnabled = s.whatsappEnabled;
    this.loading.set(false);
  }
}
