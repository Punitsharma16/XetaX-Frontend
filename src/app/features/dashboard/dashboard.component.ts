import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../core/authentication/auth.service';
import { CrmApiService } from '../../core/services/crm-api.service';
import { PermissionService } from '../../core/services/permission.service';
import { ONBOARDING_DONE_KEY } from '../onboarding/onboarding-storage';

/* Shape of GET /api/dashboard/summary — one round trip for the core page. */
interface StageSlice {
  name: string;
  color: string | null;
  isFinal: boolean;
  count: number;
}
interface Pipeline {
  formId: number;
  formName: string;
  icon: string | null;
  color: string | null;
  records: number;
  stages: StageSlice[];
}
interface RecentRecord {
  recordId: string;
  formId: number;
  formName: string | null;
  title: string | null;
  stageName: string | null;
  createdAt: string | null;
}
interface UpcomingMeeting {
  id: number;
  title: string;
  status: string;
  scheduledAt: string | null;
}
interface ActivityDay {
  date: string;
  count: number;
}
interface Activity {
  series: ActivityDay[];
  last14: number;
  prev14: number;
  wonThisMonth: number;
  tasks: { dueToday: number; overdue: number };
}
interface DashboardSummary {
  recordsVisible: boolean;
  ownOnly: boolean;
  forms: number;
  records: number;
  recordsThisWeek: number;
  automations: { total: number; active: number };
  team: { members: number; roles: number };
  meetingsUpcoming: number;
  agents: number;
  contacts: number;
  whatsapp: { connected: boolean; sent7d: number };
  emailConfigured: boolean;
  pipelines: Pipeline[];
  recent: RecentRecord[];
  meetings: UpcomingMeeting[];
  /** Added with the redesign — an older backend simply omits it. */
  activity?: Activity;
}

/* Companion endpoints — each optional; a failure only hides its tile. */
interface InvoiceSummary {
  invoiced: number;
  received: number;
  pending: number;
  overdue: number;
}
interface BillingSummary {
  planLabel: string;
  assistantQuota: number;
  assistantUsed: number;
  agentQuota: number;
  agentUsed: number;
  topupBalance: number;
  trialEndsAt: string | null;
  subscription: { endsAt: string | null; daysLeft: number } | null;
}
interface DeskBadge {
  open: number;
  mine: number;
  enabled: boolean;
}

interface Stat {
  key: string;
  label: string;
  value: string;
  icon: string;
  tone: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  route: string;
  /** Small line under the value — a comparison or a qualifier. */
  hint: string;
  /** Signed percentage rendered as a pill; undefined hides the pill. */
  delta?: number;
  /** SVG path for a sparkline in a 100×28 box; undefined draws none. */
  spark?: string;
}

interface Bar {
  date: string;
  count: number;
  pct: number;
  weekday: string;
  isToday: boolean;
}

interface SetupStep {
  label: string;
  done: boolean;
  icon: string;
  route: string;
  hint: string;
}

const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/**
 * Workspace overview. The layout answers, top to bottom, the questions a
 * manager asks first: how is intake trending, what did we close, what is
 * owed, what needs me today — then the pipelines and the latest records.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly api = inject(CrmApiService);
  private readonly auth = inject(AuthService);
  private readonly perms = inject(PermissionService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;
  /* Owner (from /api/team/me) or legacy isAdmin flag — gates admin-only cards. */
  readonly isAdmin = computed(() => this.perms.isOwner() || this.auth.isAdmin());

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly summary = signal<DashboardSummary | null>(null);
  readonly invoices = signal<InvoiceSummary | null>(null);
  readonly billing = signal<BillingSummary | null>(null);
  readonly desk = signal<DeskBadge | null>(null);

  readonly today = new Date();
  readonly greeting =
    this.today.getHours() < 12 ? 'Good morning' : this.today.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  readonly activity = computed<Activity | null>(() => this.summary()?.activity ?? null);

  /** Signed % change of the last 14 days against the 14 before. */
  readonly trend = computed<number | undefined>(() => {
    const a = this.activity();
    if (!a) return undefined;
    if (!a.prev14) return a.last14 > 0 ? 100 : 0;
    return Math.round(((a.last14 - a.prev14) / a.prev14) * 100);
  });

  readonly bars = computed<Bar[]>(() => {
    const series = this.activity()?.series ?? [];
    const max = Math.max(1, ...series.map((d) => d.count));
    const todayKey = this.isoDate(this.today);
    return series.map((d) => ({
      date: d.date,
      count: d.count,
      pct: Math.round((d.count / max) * 100),
      weekday: new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'narrow' }),
      isToday: d.date === todayKey,
    }));
  });

  readonly peakDay = computed(() => {
    const bars = this.bars();
    if (!bars.length) return null;
    return bars.reduce((best, b) => (b.count > best.count ? b : best), bars[0]);
  });

  readonly stats = computed<Stat[]>(() => {
    const s = this.summary();
    if (!s) return [];
    const a = s.activity;
    const list: Stat[] = [];

    if (s.recordsVisible) {
      list.push({
        key: 'new',
        label: s.ownOnly ? 'My new records' : 'New records',
        value: String(a ? a.last14 : s.recordsThisWeek),
        icon: 'bi-inbox',
        tone: 'brand',
        route: '/app/records',
        hint: a ? 'last 14 days' : 'this week',
        delta: this.trend(),
        spark: a ? this.sparkPath(a.series.map((d) => d.count)) : undefined,
      });
      list.push({
        key: 'won',
        label: 'Closed this month',
        value: String(a?.wonThisMonth ?? 0),
        icon: 'bi-trophy',
        tone: 'success',
        route: '/app/records',
        hint: 'reached a final stage',
      });
    }

    const inv = this.invoices();
    if (inv) {
      list.push({
        key: 'received',
        label: 'Received',
        value: INR.format(inv.received || 0),
        icon: 'bi-cash-stack',
        tone: 'success',
        route: '/app/invoices',
        hint: `${INR.format(inv.invoiced || 0)} invoiced`,
      });
      list.push({
        key: 'pending',
        label: 'Pending',
        value: INR.format(inv.pending || 0),
        icon: 'bi-hourglass-split',
        tone: inv.overdue > 0 ? 'danger' : 'warning',
        route: '/app/invoices',
        hint: inv.overdue > 0 ? `${INR.format(inv.overdue)} overdue` : 'nothing overdue',
      });
    }

    if (a) {
      list.push({
        key: 'tasks',
        label: 'Tasks today',
        value: String(a.tasks.dueToday),
        icon: 'bi-check2-square',
        tone: a.tasks.overdue > 0 ? 'danger' : 'info',
        route: '/app/tasks',
        hint: a.tasks.overdue > 0 ? `${a.tasks.overdue} overdue` : 'nothing overdue',
      });
    }

    const d = this.desk();
    if (d?.enabled) {
      list.push({
        key: 'desk',
        label: 'Waiting for a person',
        value: String(d.open),
        icon: 'bi-headset',
        tone: d.open > 0 ? 'warning' : 'neutral',
        route: '/app/dashboard',
        hint: d.mine > 0 ? `${d.mine} in your chats` : 'live chat desk',
      });
    }

    return list.slice(0, 6);
  });

  /* AI usage meter (billing summary) — assistant + website/WhatsApp agents. */
  readonly aiUsed = computed(() => {
    const b = this.billing();
    return b ? (b.assistantUsed || 0) + (b.agentUsed || 0) : 0;
  });
  readonly aiQuota = computed(() => {
    const b = this.billing();
    return b ? (b.assistantQuota || 0) + (b.agentQuota || 0) : 0;
  });
  readonly aiPct = computed(() => {
    const quota = this.aiQuota();
    return quota ? Math.min(100, Math.round((this.aiUsed() / quota) * 100)) : 0;
  });
  readonly planNote = computed(() => {
    const b = this.billing();
    if (!b) return '';
    if (b.subscription) return `${b.subscription.daysLeft} days left`;
    if (b.trialEndsAt) {
      const days = Math.max(0, Math.ceil((new Date(b.trialEndsAt).getTime() - Date.now()) / 86400000));
      return `trial · ${days} day${days === 1 ? '' : 's'} left`;
    }
    return '';
  });

  /* Setup checklist — turns the dashboard into a guided start for new orgs. */
  readonly setupSteps = computed<SetupStep[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      { label: 'Create your first form', done: s.forms > 0, icon: 'bi-ui-checks-grid', route: '/app/forms', hint: 'Start from a template — ready in 2 minutes' },
      { label: 'Connect WhatsApp', done: s.whatsapp.connected, icon: 'bi-whatsapp', route: '/app/whatsapp', hint: 'Chat and campaigns from your business number' },
      { label: 'Add your email (SMTP)', done: s.emailConfigured, icon: 'bi-envelope-at', route: '/app/profile', hint: 'Invites, campaigns and automations send as you' },
      { label: 'Save your contacts', done: s.contacts > 0, icon: 'bi-person-lines-fill', route: '/app/contacts', hint: 'One-click WhatsApp & email from their page' },
      { label: 'Invite a team member', done: s.team.members > 0, icon: 'bi-person-plus', route: '/app/users', hint: 'Roles decide what each person sees' },
      { label: 'Turn on an automation', done: s.automations.active > 0, icon: 'bi-lightning-charge', route: '/app/automations', hint: 'Welcome messages, stage moves — hands-free' },
      { label: 'Launch a website chatbot', done: s.agents > 0, icon: 'bi-robot', route: '/app/agents', hint: 'Answers your customers 24/7' },
    ];
  });
  readonly setupDone = computed(() => this.setupSteps().filter((s) => s.done).length);
  readonly setupAllDone = computed(
    () => this.setupSteps().length > 0 && this.setupDone() === this.setupSteps().length,
  );

  /** Guards the first-run redirect so it fires at most once per dashboard visit. */
  private onboardingChecked = false;

  constructor() {
    this.load();
    // First-run: a workspace owner with no forms yet is taken to the setup
    // wizard once. The wizard sets a per-user flag when finished or skipped,
    // so this never loops; /api/team/me failing (context null) means no redirect.
    effect(() => {
      const summary = this.summary();
      if (this.onboardingChecked || !summary || !this.perms.loaded()) return;
      this.onboardingChecked = true;
      if (!this.perms.isOwner() || summary.forms > 0) return;
      const userId = this.user()?.id;
      if (!userId) return;
      let done = false;
      try {
        done = !!localStorage.getItem(ONBOARDING_DONE_KEY(userId));
      } catch {
        done = true; // no storage => cannot remember a skip, so never redirect
      }
      if (!done) this.router.navigate(['/app/onboarding']);
    });
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    const quiet = { quiet: true } as const;
    // The summary is the page; the other three only add tiles, so each one is
    // allowed to fail on its own (no permission, old backend, module off).
    forkJoin({
      summary: this.api.get<DashboardSummary>('/api/dashboard/summary', undefined, quiet),
      invoices: this.canSee('invoices.view')
        ? this.api.get<InvoiceSummary>('/api/invoices/summary', undefined, quiet).pipe(catchError(() => of(null)))
        : of(null),
      billing: this.api.get<BillingSummary>('/api/billing/summary', undefined, quiet).pipe(catchError(() => of(null))),
      desk: this.api.get<DeskBadge>('/api/desk/badge', undefined, quiet).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ summary, invoices, billing, desk }) => {
        this.summary.set(summary);
        this.invoices.set(invoices);
        this.billing.set(billing);
        this.desk.set(desk);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Header search box → the assistant with the question pre-filled. */
  askAi(question: string): void {
    const q = question.trim();
    this.router.navigate(['/app/ai'], q ? { queryParams: { q } } : undefined);
  }

  /** Width % for one stage slice inside its pipeline bar (min sliver when 0). */
  slicePercent(pipeline: Pipeline, slice: StageSlice): number {
    if (!pipeline.records) return 100 / Math.max(pipeline.stages.length, 1);
    return (slice.count / pipeline.records) * 100;
  }

  /** Records sitting in a final stage — "closed" for the pipeline footer. */
  closedIn(pipeline: Pipeline): number {
    return pipeline.stages.filter((s) => s.isFinal).reduce((n, s) => n + s.count, 0);
  }

  canSee(perm: string): boolean {
    return perm.split('|').some((key) => this.perms.has(key));
  }

  initial(text: string | null): string {
    return (text || '?').trim().charAt(0).toUpperCase() || '?';
  }

  /** Polyline for a 100×28 sparkline; a flat baseline when there is no data. */
  private sparkPath(values: number[]): string {
    if (!values.length) return 'M0 27 L100 27';
    const max = Math.max(1, ...values);
    const step = values.length > 1 ? 100 / (values.length - 1) : 100;
    return values
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)} ${(27 - (v / max) * 25).toFixed(1)}`)
      .join(' ');
  }

  private isoDate(d: Date): string {
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }
}
