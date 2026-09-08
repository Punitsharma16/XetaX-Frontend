import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
} from '../../../shared/components/state/state-views.component';
import { WhatsAppNavComponent } from '../whatsapp-nav.component';
import {
  EmbeddedSignupMeta,
  WhatsAppConfig,
  WhatsAppService,
  WhatsAppTemplate,
  WhatsAppUsage,
} from '../whatsapp.service';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

/**
 * WhatsApp connection page: Meta Embedded Signup (official popup) with a
 * manual token fallback for system-user setups, plus the synced template
 * list. The access token itself never reaches this app — only the one-time
 * OAuth code (signup) or the pasted token (manual) go straight to the API.
 */
@Component({
  selector: 'app-whatsapp-settings',
  standalone: true,
  imports: [DatePipe, FormsModule, PageHeaderComponent, EmptyStateComponent, ErrorStateComponent, ModalComponent, WhatsAppNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './whatsapp-settings.component.html',
  styleUrl: './whatsapp-settings.component.css',
})
export class WhatsAppSettingsComponent implements OnDestroy {
  private readonly whatsapp = inject(WhatsAppService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly config = signal<WhatsAppConfig | null>(null);
  readonly meta = signal<EmbeddedSignupMeta | null>(null);
  readonly connecting = signal(false);

  readonly templates = signal<WhatsAppTemplate[]>([]);
  readonly syncing = signal(false);
  readonly usage = signal<WhatsAppUsage | null>(null);

  readonly usageTiles = computed(() => {
    const usage = this.usage();
    if (!usage) return [];
    return [
      { label: 'Sent', value: usage.counts.sent, icon: 'bi-send' },
      { label: 'Delivered', value: usage.counts.delivered, icon: 'bi-check2-all' },
      { label: 'Read', value: usage.counts.read, icon: 'bi-eye' },
      { label: 'Failed', value: usage.counts.failed, icon: 'bi-x-circle' },
      { label: 'Replies in (free)', value: usage.counts.inbound, icon: 'bi-chat-left-text' },
    ];
  });

  readonly spendCategories = computed(() => {
    const spend = this.usage()?.spend;
    if (!spend?.available || !spend.byCategory) return [];
    return Object.entries(spend.byCategory).map(([category, cost]) => ({ category, cost }));
  });

  /** WhatsApp par pehli baar aane wale ke liye live checklist — sab green hote hi chhup jaati hai. */
  readonly setupSteps = computed(() => {
    const cfg = this.config();
    const meta = this.meta();
    const connected = cfg?.status === 'CONNECTED';
    const approved = this.templates().some((t) => t.status === 'APPROVED');
    const sent = (this.usage()?.counts?.sent ?? 0) > 0;
    return [
      {
        key: 'app', title: 'Meta app ready on the server', done: !!meta?.configured || connected,
        how: 'One-time, done by your XetaX admin: set META_APP_ID, META_APP_SECRET and META_WHATSAPP_CONFIG_ID in the backend. Already-connected accounts skip this.',
      },
      {
        key: 'connect', title: 'Connect your WhatsApp number', done: connected,
        how: 'Click "Connect with Meta" above and finish the Facebook popup — pick/create your Meta Business, verify the phone number, add a payment method when Meta asks. Using a system-user token instead? Use Manual setup.',
      },
      {
        key: 'webhook', title: 'Webhook subscribed (delivery reports & replies)', done: !!cfg?.webhookSubscribed || (connected && cfg?.webhookSubscribed === undefined),
        how: 'Normally automatic right after connecting. If replies/read-receipts are not coming in, disconnect and connect again, or ask us to re-subscribe the webhook.',
      },
      {
        key: 'template', title: 'First template approved', done: approved,
        how: 'Create a template below (New template) — a friendly welcome or update message. Meta usually approves in a few minutes to a few hours. Templates are needed to START chats; replies within 24h are free-form.',
      },
      {
        key: 'test', title: 'Send a test message', done: sent,
        how: 'Open Conversations, send your approved template to your own number, and reply to it from your phone — that confirms both directions work.',
      },
    ];
  });

  readonly setupDone = computed(() => this.setupSteps().every((s) => s.done));
  readonly setupOpenKey = signal<string | null>(null);
  readonly setupHelpUrl =
    'https://wa.me/919034908543?text=' +
    encodeURIComponent('Hi! I want the done-for-you WhatsApp setup for my XetaX account.');

  toggleSetupStep(key: string): void {
    this.setupOpenKey.update((k) => (k === key ? null : key));
  }

  readonly approvedCount = computed(
    () => this.templates().filter((t) => t.status === 'APPROVED').length,
  );
  readonly pendingCount = computed(
    () => this.templates().filter((t) => t.status === 'PENDING').length,
  );
  readonly rejectedCount = computed(
    () => this.templates().filter((t) => t.status === 'REJECTED').length,
  );

  /** Shown while disconnected — what happens after connecting. */
  readonly steps = [
    {
      icon: 'bi-plug',
      title: 'Connect',
      text: 'Link your WhatsApp Business account and number through the Meta popup.',
    },
    {
      icon: 'bi-file-earmark-check',
      title: 'Get templates approved',
      text: 'Create a template, Meta reviews it — an approved template can message any customer.',
    },
    {
      icon: 'bi-send',
      title: 'Message & campaign',
      text: 'Send single messages from records, set up automations, or run bulk campaigns.',
    },
  ];

  /* ------------------------------------------------- new template modal */
  readonly tplOpen = signal(false);
  readonly tplSaving = signal(false);
  tplName = '';
  tplCategory: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' = 'MARKETING';
  tplLanguage = 'en';
  tplHeader = '';
  tplBody = '';
  tplFooter = '';
  tplExamples = '';

  readonly showManual = signal(false);
  manualToken = '';
  manualWabaId = '';
  manualPhoneId = '';

  /** wabaId/phoneNumberId reported by the Embedded Signup session-info event. */
  private signupWabaId: string | undefined;
  private signupPhoneId: string | undefined;
  private readonly onSignupMessage = (event: MessageEvent) => {
    if (typeof event.origin !== 'string' || !event.origin.endsWith('facebook.com')) return;
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.data) {
        this.signupWabaId = data.data.waba_id ?? this.signupWabaId;
        this.signupPhoneId = data.data.phone_number_id ?? this.signupPhoneId;
      }
    } catch {
      /* other window messages — ignore */
    }
  };

  constructor() {
    window.addEventListener('message', this.onSignupMessage);
    this.reload();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onSignupMessage);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.whatsapp.getConfig().subscribe({
      next: (config) => {
        this.config.set(config);
        this.loading.set(false);
        if (config.status === 'CONNECTED') {
          this.loadTemplates();
          this.loadUsage();
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
    this.whatsapp.getSignupMeta().subscribe({
      next: (meta) => {
        this.meta.set(meta);
        if (meta.configured) this.loadFbSdk(meta.appId);
      },
    });
  }

  get connected(): boolean {
    return this.config()?.status === 'CONNECTED';
  }

  /* ------------------------------------------------------ embedded signup */

  private loadFbSdk(appId: string): void {
    if (window.FB || document.getElementById('fb-sdk')) return;
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, autoLogAppEvents: true, xfbml: false, version: 'v23.0' });
    };
    const script = document.createElement('script');
    script.id = 'fb-sdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }

  launchSignup(): void {
    const meta = this.meta();
    if (!meta?.configured) {
      this.toast.warning(
        'Not configured',
        'META_APP_ID / META_WHATSAPP_CONFIG_ID are not set on the server yet.',
      );
      return;
    }
    if (!window.FB) {
      this.toast.warning('One moment', 'Meta SDK is still loading — try again in a second.');
      return;
    }
    this.connecting.set(true);
    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        if (!code) {
          this.connecting.set(false);
          this.toast.warning('Signup cancelled', 'The WhatsApp signup was not completed.');
          return;
        }
        this.whatsapp
          .completeOnboarding(code, this.signupWabaId, this.signupPhoneId)
          .subscribe({
            next: (config) => {
              this.connecting.set(false);
              this.config.set(config);
              this.toast.success('WhatsApp connected', config.displayPhoneNumber ?? '');
              this.loadTemplates();
            },
            error: () => this.connecting.set(false),
          });
      },
      {
        config_id: meta.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      },
    );
  }

  /* -------------------------------------------------------- manual connect */

  manualConnect(): void {
    if (!this.manualToken.trim() || !this.manualWabaId.trim() || !this.manualPhoneId.trim()) {
      this.toast.warning('Missing details', 'Token, WABA id and phone number id are all required.');
      return;
    }
    this.connecting.set(true);
    this.whatsapp
      .manualConnect(this.manualToken.trim(), this.manualWabaId.trim(), this.manualPhoneId.trim())
      .subscribe({
        next: (config) => {
          this.connecting.set(false);
          this.config.set(config);
          this.manualToken = '';
          this.showManual.set(false);
          this.toast.success('WhatsApp connected', config.displayPhoneNumber ?? '');
          this.loadTemplates();
        },
        error: () => this.connecting.set(false),
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
            this.templates.set([]);
            this.toast.success('Disconnected', 'WhatsApp has been disconnected.');
          },
        });
      });
  }

  /* ------------------------------------------------------------ templates */

  loadUsage(): void {
    this.whatsapp.usage().subscribe({
      next: (usage) => this.usage.set(usage),
      error: () => this.usage.set(null),
    });
  }

  loadTemplates(): void {
    this.whatsapp.getTemplates().subscribe({ next: (list) => this.templates.set(list) });
  }

  /** Highest {{n}} used in the body — that many example values are needed. */
  tplVariableCount(): number {
    let max = 0;
    for (const match of this.tplBody.matchAll(/\{\{(\d+)}}/g)) {
      max = Math.max(max, Number(match[1]));
    }
    return max;
  }

  openTemplateModal(): void {
    this.tplOpen.set(true);
  }

  submitTemplate(): void {
    if (!this.tplName.trim()) {
      this.toast.warning('Name missing', 'Give the template a name (e.g. order_update).');
      return;
    }
    if (this.tplCategory !== 'AUTHENTICATION' && !this.tplBody.trim()) {
      this.toast.warning('Body missing', 'Write the template body text.');
      return;
    }
    const examples = this.tplExamples
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    const needed = this.tplVariableCount();
    if (this.tplCategory !== 'AUTHENTICATION' && examples.length < needed) {
      this.toast.warning(
        'Examples needed',
        `Body uses {{${needed}}} — give ${needed} example value(s), comma-separated. Meta rejects templates without examples.`,
      );
      return;
    }
    this.tplSaving.set(true);
    this.whatsapp
      .createTemplate({
        name: this.tplName.trim(),
        category: this.tplCategory,
        language: this.tplLanguage.trim() || 'en',
        headerText: this.tplHeader.trim() || undefined,
        bodyText: this.tplBody.trim() || undefined,
        footerText: this.tplFooter.trim() || undefined,
        exampleParams: examples.length ? examples : undefined,
      })
      .subscribe({
        next: (template) => {
          this.tplSaving.set(false);
          this.tplOpen.set(false);
          this.tplName = this.tplHeader = this.tplBody = this.tplFooter = this.tplExamples = '';
          this.toast.success(
            'Submitted to Meta',
            `'${template.name}' is ${template.status} — approval usually takes minutes to 24h.`,
          );
          this.loadTemplates();
        },
        error: () => this.tplSaving.set(false),
      });
  }

  deleteTemplate(template: WhatsAppTemplate): void {
    this.confirm.confirmDelete(`template '${template.name}'`).subscribe((ok) => {
      if (!ok) return;
      this.whatsapp.deleteTemplate(template.name).subscribe({
        next: () => {
          this.toast.success('Template deleted', template.name);
          this.loadTemplates();
        },
      });
    });
  }

  syncTemplates(): void {
    this.syncing.set(true);
    this.whatsapp.syncTemplates().subscribe({
      next: (list) => {
        this.syncing.set(false);
        this.templates.set(list);
        this.toast.success('Templates synced', `${list.length} templates`);
      },
      error: () => this.syncing.set(false),
    });
  }
}
