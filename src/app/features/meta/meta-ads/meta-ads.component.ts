import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/state/state-views.component';
import { FormResponse, StageResponse } from '../../../core/models/crm.model';
import { FormService } from '../../forms/form.service';
import { StageService } from '../../stages/stage.service';
import {
  AdReport,
  MetaAdAccountOption,
  MetaConnection,
  MetaPageOption,
  MetaService,
  RecentAdLead,
} from '../meta.service';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

/**
 * Facebook & Instagram lead ads: connect a Page, choose where its leads land,
 * and see what the ad spend actually produced in the pipeline.
 */
@Component({
  selector: 'app-meta-ads',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, PageHeaderComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meta-ads.component.html',
  styleUrl: './meta-ads.component.css',
})
export class MetaAdsComponent {
  private readonly meta = inject(MetaService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly formService = inject(FormService);
  private readonly stageService = inject(StageService);

  readonly loading = signal(true);
  readonly configured = signal(false);
  readonly connections = signal<MetaConnection[]>([]);
  readonly connecting = signal(false);
  readonly saving = signal(false);
  readonly syncing = signal(false);

  readonly forms = signal<FormResponse[]>([]);
  readonly stages = signal<StageResponse[]>([]);

  /* page picker after the popup */
  readonly pages = signal<MetaPageOption[]>([]);
  readonly adAccounts = signal<MetaAdAccountOption[]>([]);
  readonly pickerOpen = signal(false);
  pickPageId = '';
  pickAdAccountId = '';
  pickFormId: number | null = null;

  /* settings of the connected page */
  editFormId: number | null = null;
  editWonStageId: number | null = null;
  editAdAccountId = '';

  /* report */
  readonly report = signal<AdReport | null>(null);
  readonly recent = signal<RecentAdLead[]>([]);
  rangeDays = 30;

  readonly connection = computed(() => this.connections()[0] ?? null);
  readonly connected = computed(() => this.connection()?.status === 'CONNECTED');

  private signupMeta: { appId: string; configId: string; graphApiVersion: string } | null = null;
  private fbReady: Promise<boolean> | null = null;
  private fbInited = false;

  constructor() {
    this.formService.getAll().subscribe({ next: (list) => this.forms.set(list ?? []) });
    this.meta.signupMeta().subscribe({
      next: (m) => {
        this.configured.set(m.configured);
        this.signupMeta = m;
        if (m.configured) void this.loadFbSdk(m.appId, m.graphApiVersion);
      },
      error: () => this.configured.set(false),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.meta.connections().subscribe({
      next: (list) => {
        this.connections.set(list ?? []);
        this.loading.set(false);
        const c = this.connection();
        if (c) {
          this.editFormId = c.targetFormId;
          this.editWonStageId = c.wonStageId;
          this.editAdAccountId = c.adAccountId ?? '';
          if (c.targetFormId) this.loadStages(c.targetFormId);
          this.loadReport();
          this.meta.recentLeads().subscribe({ next: (r) => this.recent.set(r ?? []) });
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private loadStages(formId: number): void {
    this.stageService.getByForm(formId).subscribe({ next: (list) => this.stages.set(list ?? []) });
  }

  onFormChange(): void {
    this.stages.set([]);
    this.editWonStageId = null;
    if (this.editFormId) this.loadStages(this.editFormId);
  }

  /* ------------------------------------------------------------- connect */

  private loadFbSdk(appId: string, version: string): Promise<boolean> {
    if (this.fbReady) return this.fbReady;
    this.fbReady = new Promise<boolean>((resolve) => {
      const init = (): void => {
        if (!window.FB) {
          resolve(false);
          return;
        }
        if (!this.fbInited) {
          this.fbInited = true;
          try {
            window.FB.init({ appId, autoLogAppEvents: true, xfbml: false, version: version || 'v23.0' });
          } catch {
            /* another page already initialised it */
          }
        }
        resolve(true);
      };
      if (window.FB) {
        init();
        return;
      }
      if (!document.getElementById('fb-sdk')) {
        window.fbAsyncInit = init;
        const script = document.createElement('script');
        script.id = 'fb-sdk';
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      }
      const startedAt = Date.now();
      const poll = setInterval(() => {
        if (window.FB) {
          clearInterval(poll);
          init();
        } else if (Date.now() - startedAt > 12000) {
          clearInterval(poll);
          resolve(false);
        }
      }, 150);
    });
    return this.fbReady;
  }

  connect(): void {
    const meta = this.signupMeta;
    if (!meta || !this.configured()) {
      this.toast.warning('Not configured', 'META_LEADS_CONFIG_ID is not set on the server yet.');
      return;
    }
    if (window.FB) {
      this.openPopup(meta);
      return;
    }
    this.connecting.set(true);
    this.loadFbSdk(meta.appId, meta.graphApiVersion).then((ready) => {
      this.connecting.set(false);
      if (!ready) {
        this.toast.error(
          "Facebook's popup could not load",
          'An ad-blocker usually blocks connect.facebook.net — allow it for this page and try again.',
        );
        return;
      }
      this.openPopup(meta);
    });
  }

  private openPopup(meta: { configId: string }): void {
    this.connecting.set(true);
    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        if (!code) {
          this.connecting.set(false);
          this.toast.warning('Cancelled', 'The Facebook connection was not completed.');
          return;
        }
        this.meta.connect(code).subscribe({
          next: (choices) => {
            this.connecting.set(false);
            this.pages.set(choices.pages ?? []);
            this.adAccounts.set(choices.adAccounts ?? []);
            this.pickPageId = choices.pages?.[0]?.id ?? '';
            this.pickAdAccountId = choices.adAccounts?.[0]?.id ?? '';
            this.pickFormId = this.forms()[0]?.id ?? null;
            this.pickerOpen.set(true);
          },
          error: () => this.connecting.set(false),
        });
      },
      { config_id: meta.configId, response_type: 'code', override_default_response_type: true },
    );
  }

  confirmPage(): void {
    if (!this.pickPageId) {
      this.toast.warning('Pick the Page your ads run on');
      return;
    }
    this.saving.set(true);
    this.meta
      .choose({
        pageId: this.pickPageId,
        adAccountId: this.pickAdAccountId || null,
        formId: this.pickFormId,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.pickerOpen.set(false);
          this.toast.success('Facebook connected', 'New leads from your ads will appear here.');
          this.load();
        },
        error: () => this.saving.set(false),
      });
  }

  saveSettings(): void {
    const c = this.connection();
    if (!c) return;
    this.saving.set(true);
    this.meta
      .update(c.id, {
        formId: this.editFormId,
        wonStageId: this.editWonStageId,
        adAccountId: this.editAdAccountId || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.success('Saved');
          this.load();
        },
        error: () => this.saving.set(false),
      });
  }

  disconnect(): void {
    const c = this.connection();
    if (!c) return;
    this.confirm
      .ask({
        title: 'Disconnect this Page?',
        message: 'New ad leads will stop arriving. Records already created stay where they are.',
        confirmText: 'Disconnect',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.meta.disconnect(c.id).subscribe({
          next: () => {
            this.toast.success('Disconnected');
            this.report.set(null);
            this.load();
          },
        });
      });
  }

  /* -------------------------------------------------------------- report */

  loadReport(): void {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - (Number(this.rangeDays) || 30) + 1);
    this.meta.report(this.iso(from), this.iso(to)).subscribe({
      next: (r) => this.report.set(r),
      error: () => this.report.set(null),
    });
  }

  syncSpend(): void {
    const c = this.connection();
    if (!c) return;
    if (!c.adAccountId) {
      this.toast.warning('No ad account', 'Pick the ad account below so spend can be pulled.');
      return;
    }
    this.syncing.set(true);
    this.meta.syncSpend(c.id, Number(this.rangeDays) || 30).subscribe({
      next: (r) => {
        this.syncing.set(false);
        this.toast.success('Spend updated', `${r.rows} day-rows pulled from Meta.`);
        this.loadReport();
      },
      error: () => this.syncing.set(false),
    });
  }

  private iso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
