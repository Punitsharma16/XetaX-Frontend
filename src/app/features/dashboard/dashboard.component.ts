import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/authentication/auth.service';
import { CrmApiService } from '../../core/services/crm-api.service';
import { PermissionService } from '../../core/services/permission.service';
import { ONBOARDING_DONE_KEY } from '../onboarding/onboarding-storage';

/* Shape of GET /api/dashboard/summary — one round trip for the whole page. */
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
}

interface Kpi {
  label: string;
  value: number;
  icon: string;
  tone: 'indigo' | 'blue' | 'amber' | 'green' | 'teal' | 'violet' | 'rose';
  route: string;
  hint: string;
}

interface SetupStep {
  label: string;
  done: boolean;
  icon: string;
  route: string;
  hint: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe],
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

  readonly kpis = computed<Kpi[]>(() => {
    const s = this.summary();
    if (!s) return [];
    const list: Kpi[] = [];
    if (s.recordsVisible) {
      list.push({
        label: s.ownOnly ? 'My records' : 'Records',
        value: s.records,
        icon: 'bi-collection',
        tone: 'indigo',
        route: '/app/records',
        hint: s.recordsThisWeek > 0 ? `+${s.recordsThisWeek} this week` : 'No new this week',
      });
    }
    list.push(
      {
        label: 'Forms',
        value: s.forms,
        icon: 'bi-ui-checks-grid',
        tone: 'blue',
        route: '/app/forms',
        hint: 'Your workspaces',
      },
      {
        label: 'Automations',
        value: s.automations.total,
        icon: 'bi-lightning-charge',
        tone: 'amber',
        route: '/app/automations',
        hint: `${s.automations.active} running`,
      },
      {
        label: 'Contacts',
        value: s.contacts,
        icon: 'bi-person-lines-fill',
        tone: 'rose',
        route: '/app/contacts',
        hint: 'Address book',
      },
      {
        label: 'Team',
        value: s.team.members,
        icon: 'bi-people',
        tone: 'green',
        route: '/app/users',
        hint: `${s.team.roles} role${s.team.roles === 1 ? '' : 's'}`,
      },
      {
        label: 'Meetings',
        value: s.meetingsUpcoming,
        icon: 'bi-camera-video',
        tone: 'teal',
        route: '/app/meetings',
        hint: 'Upcoming',
      },
      {
        label: 'AI Agents',
        value: s.agents,
        icon: 'bi-robot',
        tone: 'violet',
        route: '/app/agents',
        hint: 'On your website',
      },
    );
    return list;
  });

  /* Setup checklist — turns the dashboard into a guided start for new orgs. */
  readonly setupSteps = computed<SetupStep[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      {
        label: 'Create your first form',
        done: s.forms > 0,
        icon: 'bi-ui-checks-grid',
        route: '/app/forms',
        hint: 'Start from a template — ready in 2 minutes',
      },
      {
        label: 'Connect WhatsApp',
        done: s.whatsapp.connected,
        icon: 'bi-whatsapp',
        route: '/app/whatsapp',
        hint: 'Chat and campaigns from your business number',
      },
      {
        label: 'Add your email (SMTP)',
        done: s.emailConfigured,
        icon: 'bi-envelope-at',
        route: '/app/profile',
        hint: 'Invites and automations send as you',
      },
      {
        label: 'Save your contacts',
        done: s.contacts > 0,
        icon: 'bi-person-lines-fill',
        route: '/app/contacts',
        hint: 'One-click WhatsApp & email from their page',
      },
      {
        label: 'Invite a team member',
        done: s.team.members > 0,
        icon: 'bi-person-plus',
        route: '/app/users',
        hint: 'Roles decide what each person sees',
      },
      {
        label: 'Turn on an automation',
        done: s.automations.active > 0,
        icon: 'bi-lightning-charge',
        route: '/app/automations',
        hint: 'Welcome messages, stage moves — hands-free',
      },
      {
        label: 'Launch a website chatbot',
        done: s.agents > 0,
        icon: 'bi-robot',
        route: '/app/agents',
        hint: 'Answers your customers 24/7',
      },
    ];
  });

  readonly setupDone = computed(() => this.setupSteps().filter((s) => s.done).length);
  readonly setupAllDone = computed(
    () => this.setupSteps().length > 0 && this.setupDone() === this.setupSteps().length,
  );

  readonly greeting = new Date().getHours() < 12
    ? 'Good morning'
    : new Date().getHours() < 17
      ? 'Good afternoon'
      : 'Good evening';

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
    this.api.get<DashboardSummary>('/api/dashboard/summary', undefined, { quiet: true }).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Width % for one stage slice inside its pipeline bar (min sliver when 0). */
  slicePercent(pipeline: Pipeline, slice: StageSlice): number {
    if (!pipeline.records) return 100 / Math.max(pipeline.stages.length, 1);
    return (slice.count / pipeline.records) * 100;
  }

  canSee(perm: string): boolean {
    return perm.split('|').some((key) => this.perms.has(key));
  }
}
