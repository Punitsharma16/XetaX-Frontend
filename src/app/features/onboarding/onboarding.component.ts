import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../core/authentication/auth.service';
import { CrmApiService } from '../../core/services/crm-api.service';
import { ToastService } from '../../core/services/toast.service';
import { ApplyResult, FormTemplate, TemplateService } from '../forms/template.service';
import { OrgRole, TeamMember, TeamService } from '../users/team.service';
import { UserService } from '../users/user.service';
import { ONBOARDING_DONE_KEY, ONBOARDING_STEP_KEY } from './onboarding-storage';

/** The slice of /api/dashboard/summary the channel cards need. */
interface ChannelStatus {
  whatsapp: { connected: boolean };
  emailConfigured: boolean;
  agents: number;
}

interface StepMeta {
  label: string;
  icon: string;
}

/**
 * First-run setup wizard for a new workspace owner.
 *
 * Four skippable steps (profile, template, channels, team) followed by a
 * "you're set" screen. The current step is persisted per user so a reload
 * resumes where the owner left off; finishing or skipping sets the "done"
 * flag the dashboard checks before auto-opening this page.
 */
@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.css',
})
export class OnboardingComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly api = inject(CrmApiService);
  private readonly userService = inject(UserService);
  private readonly templateService = inject(TemplateService);
  private readonly team = inject(TeamService);

  /*
   * `?reopen=1` (the "Setup guide" menu entry) needs no handling here: the
   * done flag is only consulted by the dashboard's auto-redirect, never by
   * this page, so a direct visit always opens the wizard.
   */
  readonly user = this.auth.user;

  readonly steps: StepMeta[] = [
    { label: 'Your profile', icon: 'bi-person-badge' },
    { label: 'Pick a template', icon: 'bi-grid-1x2' },
    { label: 'Connect channels', icon: 'bi-broadcast' },
    { label: 'Invite your team', icon: 'bi-people' },
  ];

  /** 0..3 = the four steps, 4 = finish screen. */
  readonly step = signal(this.restoreStep());
  readonly finished = computed(() => this.step() >= this.steps.length);
  readonly progress = computed(() =>
    Math.round((Math.min(this.step(), this.steps.length) / this.steps.length) * 100),
  );

  // ------------------------------------------------------------ step 1: profile

  company = this.user()?.company ?? '';
  phone = this.user()?.phone ?? '';
  readonly savingProfile = signal(false);
  readonly profileSaved = signal(false);

  // ----------------------------------------------------------- step 2: template

  readonly templates = signal<FormTemplate[] | null>(null);
  readonly templatesFailed = signal(false);
  readonly applyingKey = signal<string | null>(null);
  readonly applied = signal<ApplyResult | null>(null);

  // ----------------------------------------------------------- step 3: channels

  readonly channels = signal<ChannelStatus | null>(null);

  // --------------------------------------------------------------- step 4: team

  readonly roles = signal<OrgRole[]>([]);
  readonly rolesLoaded = signal(false);
  readonly addedMembers = signal<TeamMember[]>([]);
  readonly savingMember = signal(false);
  mName = '';
  mEmail = '';
  mPassword = '';
  mRoleId: number | null = null;

  constructor() {
    this.loadForStep(this.step());
  }

  // ------------------------------------------------------------------ stepper

  next(): void {
    this.goTo(Math.min(this.step() + 1, this.steps.length));
  }

  back(): void {
    this.goTo(Math.max(this.step() - 1, 0));
  }

  goTo(index: number): void {
    this.step.set(index);
    this.persistStep(index);
    this.loadForStep(index);
  }

  /** "Skip for now" — leave the wizard; it can be reopened from the user menu. */
  skipAll(): void {
    this.markDone();
    this.router.navigate(['/app/dashboard']);
  }

  finish(): void {
    this.markDone();
    this.router.navigate(['/app/dashboard']);
  }

  /** Each step's data is fetched lazily the first time the step is shown. */
  private loadForStep(index: number): void {
    if (index === 1 && this.templates() === null && !this.templatesFailed()) this.loadTemplates();
    if (index === 2 && this.channels() === null) this.loadChannels();
    if (index === 3 && !this.rolesLoaded()) this.loadRoles();
  }

  private restoreStep(): number {
    const id = this.auth.user()?.id;
    if (!id) return 0;
    try {
      // A finished wizard reopened from the menu starts from the top again.
      if (localStorage.getItem(ONBOARDING_DONE_KEY(id))) return 0;
      const raw = Number(localStorage.getItem(ONBOARDING_STEP_KEY(id)));
      return Number.isFinite(raw) && raw >= 0 && raw <= this.steps.length ? raw : 0;
    } catch {
      return 0;
    }
  }

  private persistStep(index: number): void {
    const id = this.auth.user()?.id;
    if (!id) return;
    try {
      localStorage.setItem(ONBOARDING_STEP_KEY(id), String(index));
    } catch {
      /* storage unavailable — resume simply will not work */
    }
  }

  private markDone(): void {
    const id = this.auth.user()?.id;
    if (!id) return;
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY(id), new Date().toISOString());
      localStorage.removeItem(ONBOARDING_STEP_KEY(id));
    } catch {
      /* ignore */
    }
  }

  // ------------------------------------------------------------------ profile

  /** Same call the profile page makes for its "Account details" form. */
  saveProfile(): void {
    const current = this.user();
    if (!current) return;
    this.savingProfile.set(true);
    this.userService
      .update(current.id, {
        name: current.name,
        email: current.email,
        phone: this.phone.trim() || undefined,
        company: this.company.trim() || undefined,
        isEnable: true,
        isAdmin: current.isAdmin,
      })
      .subscribe({
        next: () => {
          this.savingProfile.set(false);
          this.profileSaved.set(true);
          this.toast.success('Profile saved', 'Company and phone are stored on your account.');
          this.next();
        },
        error: () => this.savingProfile.set(false),
      });
  }

  // ---------------------------------------------------------------- templates

  private loadTemplates(): void {
    this.templateService.catalog().subscribe({
      next: (list) => this.templates.set(list ?? []),
      error: () => {
        this.templates.set([]);
        this.templatesFailed.set(true);
      },
    });
  }

  applyTemplate(template: FormTemplate): void {
    if (this.applyingKey()) return;
    this.applyingKey.set(template.key);
    this.templateService.apply(template.key).subscribe({
      next: (result) => {
        this.applyingKey.set(null);
        this.applied.set(result);
        this.toast.success(`${result.form.name} ready!`, result.note);
      },
      error: () => this.applyingKey.set(null),
    });
  }

  // ----------------------------------------------------------------- channels

  private loadChannels(): void {
    this.api.get<ChannelStatus>('/api/dashboard/summary', undefined, { quiet: true }).subscribe({
      next: (s) => this.channels.set(s),
      error: () => this.channels.set({ whatsapp: { connected: false }, emailConfigured: false, agents: 0 }),
    });
  }

  // --------------------------------------------------------------------- team

  private loadRoles(): void {
    this.team.roles().subscribe({
      next: (roles) => {
        this.roles.set(roles ?? []);
        this.rolesLoaded.set(true);
        if (this.mRoleId === null) {
          const firstCustom = this.roles().find((role) => !role.system);
          this.mRoleId = (firstCustom ?? this.roles()[0])?.id ?? null;
        }
      },
      error: () => this.rolesLoaded.set(true),
    });
  }

  addMember(): void {
    if (!this.mName.trim() || !this.mEmail.trim() || this.mPassword.length < 6 || !this.mRoleId) {
      this.toast.warning(
        'Details incomplete',
        'Name, email, a 6+ character password and a role are all required.',
      );
      return;
    }
    this.savingMember.set(true);
    this.team
      .createMember(this.mName.trim(), this.mEmail.trim(), this.mPassword, this.mRoleId)
      .subscribe({
        next: (member) => {
          this.savingMember.set(false);
          this.addedMembers.update((list) => [...list, member]);
          this.mName = this.mEmail = this.mPassword = '';
          this.toast.success('Member added', `${member.name} → ${member.roleName}`);
        },
        error: () => this.savingMember.set(false),
      });
  }
}
