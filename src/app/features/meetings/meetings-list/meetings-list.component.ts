import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { WhatsAppService } from '../../whatsapp/whatsapp.service';
import { Meeting, MeetingInvitee, MeetingNote, MeetingService } from '../meeting.service';

/**
 * Meetings home: create (instant / scheduled), share the guest link over
 * WhatsApp or email (WhatsApp option only when the account is connected),
 * join, and read the notes of past meetings.
 */
@Component({
  selector: 'app-meetings-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ModalComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './meetings-list.component.html',
  styleUrl: './meetings-list.component.css',
})
export class MeetingsListComponent {
  private readonly meetings = inject(MeetingService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly all = signal<Meeting[]>([]);
  readonly tab = signal<'upcoming' | 'past'>('upcoming');
  readonly whatsappConnected = signal(false);

  /* create modal */
  readonly createOpen = signal(false);
  readonly saving = signal(false);
  mode: 'instant' | 'scheduled' = 'instant';
  title = '';
  scheduleAt = '';
  invitees: { name: string; phone: string; email: string }[] = [
    { name: '', phone: '', email: '' },
  ];
  private recordId: string | undefined;

  /* share modal */
  readonly shareFor = signal<Meeting | null>(null);
  readonly sharing = signal(false);

  /* notes modal */
  readonly notesFor = signal<Meeting | null>(null);
  readonly notes = signal<MeetingNote[]>([]);

  readonly visible = computed(() => {
    const list = this.all();
    const isPast = (m: Meeting) => m.status === 'ENDED' || m.status === 'CANCELLED';
    return this.tab() === 'past' ? list.filter(isPast) : list.filter((m) => !isPast(m));
  });

  constructor() {
    this.load();
    this.whatsapp.getConfig(true).subscribe({
      next: (config) => this.whatsappConnected.set(config.status === 'CONNECTED'),
      error: () => this.whatsappConnected.set(false),
    });

    // Record page hands off prefill data via query params (?new=1&recordId=…)
    const params = this.route.snapshot.queryParamMap;
    if (params.get('new') === '1') {
      this.recordId = params.get('recordId') ?? undefined;
      this.title = params.get('title') ?? '';
      this.invitees = [
        {
          name: params.get('name') ?? '',
          phone: params.get('phone') ?? '',
          email: params.get('email') ?? '',
        },
      ];
      this.createOpen.set(true);
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.meetings.list().subscribe({
      next: (page) => {
        this.all.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  openCreate(mode: 'instant' | 'scheduled'): void {
    this.mode = mode;
    this.createOpen.set(true);
  }

  create(): void {
    if (!this.title.trim()) {
      this.toast.warning('Title missing', 'Give the meeting a name.');
      return;
    }
    if (this.mode === 'scheduled' && !this.scheduleAt) {
      this.toast.warning('Time missing', 'Pick a date/time for the schedule.');
      return;
    }
    this.saving.set(true);
    const invitees = this.invitees
      .map((i) => ({
        name: i.name.trim() || undefined,
        phone: i.phone.trim() || undefined,
        email: i.email.trim() || undefined,
      }))
      .filter((i) => i.name || i.phone || i.email);
    this.meetings
      .create({
        title: this.title.trim(),
        scheduledAt:
          this.mode === 'scheduled' ? new Date(this.scheduleAt).toISOString() : undefined,
        recordId: this.recordId,
        invitees,
      })
      .subscribe({
        next: (meeting) => {
          this.saving.set(false);
          this.createOpen.set(false);
          this.resetForm();
          this.all.update((list) => [meeting, ...list]);
          this.toast.success('Meeting created', meeting.title);
          this.shareFor.set(meeting); // straight into the share step
        },
        error: () => this.saving.set(false),
      });
  }

  private resetForm(): void {
    this.title = this.scheduleAt = '';
    this.invitees = [{ name: '', phone: '', email: '' }];
    this.recordId = undefined;
    this.mode = 'instant';
  }

  addInvitee(): void {
    this.invitees = [...this.invitees, { name: '', phone: '', email: '' }];
  }

  removeInvitee(index: number): void {
    this.invitees = this.invitees.filter((_, i) => i !== index);
    if (!this.invitees.length) this.invitees = [{ name: '', phone: '', email: '' }];
  }

  join(meeting: Meeting): void {
    window.open(meeting.hostLink, '_blank');
  }

  copyLink(meeting: Meeting): void {
    navigator.clipboard?.writeText(meeting.guestLink).then(
      () => this.toast.success('Link copied', 'The guest link is on your clipboard.'),
      () => this.toast.error('Copy failed', meeting.guestLink),
    );
  }

  /** inviteeId omitted => send to every invitee that has the needed contact. */
  share(channel: 'WHATSAPP' | 'EMAIL', invitee?: MeetingInvitee): void {
    const meeting = this.shareFor();
    if (!meeting) return;
    this.sharing.set(true);
    this.meetings.share(meeting.id, channel, invitee?.id).subscribe({
      next: (result) => {
        this.sharing.set(false);
        const label = channel === 'WHATSAPP' ? 'WhatsApp' : 'Email';
        if (result.failed.length) {
          this.toast.warning(
            `${label}: ${result.sentCount} sent, ${result.failed.length} failed`,
            result.failed.map((f) => `${f.to}: ${f.reason}`).join(' · ').slice(0, 160),
          );
        } else {
          this.toast.success('Invite sent', `${label} → ${result.sent.join(', ')}`);
        }
      },
      error: () => this.sharing.set(false),
    });
  }

  canShare(meeting: Meeting, channel: 'WHATSAPP' | 'EMAIL'): boolean {
    return meeting.invitees.some((i) => (channel === 'WHATSAPP' ? !!i.phone : !!i.email));
  }

  cancel(meeting: Meeting): void {
    this.confirm
      .ask({
        title: 'Cancel this meeting?',
        message: `"${meeting.title}" will be cancelled — its link will stop working.`,
        confirmText: 'Cancel meeting',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.meetings.cancel(meeting.id).subscribe({
          next: (updated) => {
            this.all.update((list) => list.map((m) => (m.id === updated.id ? updated : m)));
            this.toast.success('Meeting cancelled');
          },
        });
      });
  }

  openNotes(meeting: Meeting): void {
    this.notesFor.set(meeting);
    this.notes.set([]);
    this.meetings.notes(meeting.id).subscribe({ next: (list) => this.notes.set(list) });
  }

  badge(status: Meeting['status']): string {
    switch (status) {
      case 'LIVE':
        return 'text-bg-success';
      case 'SCHEDULED':
        return 'text-bg-info';
      case 'ENDED':
        return 'text-bg-secondary';
      case 'CANCELLED':
        return 'text-bg-dark';
    }
  }
}
