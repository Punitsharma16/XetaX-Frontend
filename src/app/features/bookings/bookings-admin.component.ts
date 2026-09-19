import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../shared/components/state/state-views.component';
import {
  BookingForm,
  BookingPage,
  BookingService,
  BookingSlot,
  BookingStaff,
} from './booking.service';

type Tab = 'diary' | 'people' | 'share';

interface StaffDraft {
  id: number | null;
  name: string;
  role: string;
  active: boolean;
}

interface DayGroup {
  date: string;
  label: string;
  slots: BookingSlot[];
  open: number;
  booked: number;
}

/**
 * The salon's diary: the people who take appointments, the slots they are free
 * in, and the link customers book from.
 *
 * <p>Nothing on this page is a record. A confirmed booking is the one thing
 * that becomes one — it appears under Records, in the Hair Salon form, and the
 * slot here carries a link straight to it.
 */
@Component({
  selector: 'app-bookings-admin',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bookings-admin.component.html',
  styleUrl: './bookings-admin.component.css',
})
export class BookingsAdminComponent {
  private readonly bookings = inject(BookingService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly working = signal(false);

  readonly page = signal<BookingPage | null>(null);
  readonly forms = signal<BookingForm[]>([]);
  readonly staff = signal<BookingStaff[]>([]);
  readonly slots = signal<BookingSlot[]>([]);

  readonly tab = signal<Tab>('diary');

  /** The person being added or edited, or null while the form is closed. */
  readonly staffDraft = signal<StaffDraft | null>(null);

  /* ----------------------------------------------------- add-slots form */

  readonly planStaff = signal<number[]>([]);
  planFrom = this.today();
  planTo = this.today();
  planStart = '10:00';
  planEnd = '19:00';
  planMinutes = 30;
  readonly planWeekdays = signal<number[]>([]);

  readonly weekdayNames = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 7, label: 'Sun' },
  ];

  /** The diary, a card per day — the way a salon actually reads it. */
  readonly days = computed<DayGroup[]>(() => {
    const groups = new Map<string, DayGroup>();
    for (const slot of this.slots()) {
      let group = groups.get(slot.date);
      if (!group) {
        group = { date: slot.date, label: this.dayLabel(slot.date), slots: [], open: 0, booked: 0 };
        groups.set(slot.date, group);
      }
      group.slots.push(slot);
      if (slot.status === 'OPEN') group.open++;
      if (slot.status === 'BOOKED') group.booked++;
    }
    return [...groups.values()];
  });

  readonly bookedCount = computed(() => this.slots().filter((s) => s.status === 'BOOKED').length);
  readonly openCount = computed(() => this.slots().filter((s) => s.status === 'OPEN').length);
  readonly activeStaff = computed(() => this.staff().filter((s) => s.active));

  /** What still has to happen before customers can book. */
  readonly blockers = computed<string[]>(() => {
    const out: string[] = [];
    if (!this.activeStaff().length) out.push('Add at least one person');
    if (!this.openCount()) out.push('Add some slots');
    if (!this.page()?.formId) out.push('Choose the form bookings go into');
    return out;
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.bookings.overview().subscribe({
      next: (data) => {
        this.page.set(data.page);
        this.forms.set(data.bookingForms ?? []);
        this.staff.set(data.staff ?? []);
        this.slots.set(data.slots ?? []);
        this.failed.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  /* --------------------------------------------------------------- page */

  savePage(changes: Parameters<BookingService['updatePage']>[0]): void {
    this.working.set(true);
    this.bookings.updatePage(changes).subscribe({
      next: (page) => {
        this.page.set(page);
        this.working.set(false);
        this.toast.success('Saved');
      },
      error: () => this.working.set(false),
    });
  }

  toggleEnabled(): void {
    const page = this.page();
    if (!page) return;
    if (!page.enabled && this.blockers().length) {
      this.toast.error('Not ready yet', this.blockers().join(' · '));
      return;
    }
    this.savePage({ enabled: !page.enabled });
  }

  chooseForm(formId: string): void {
    this.savePage({ formId: formId ? Number(formId) : null });
  }

  copyLink(): void {
    const url = this.page()?.publicUrl;
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => this.toast.success('Link copied'),
      () => this.toast.error('Could not copy the link'),
    );
  }

  regenerateKey(): void {
    this.confirm
      .ask({
        title: 'Create a new link?',
        message: 'The old link and every printed QR code stop working straight away.',
        confirmText: 'Create new link',
        variant: 'danger',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.bookings.regenerateKey().subscribe({
          next: (page) => {
            this.page.set(page);
            this.toast.success('New link created');
          },
        });
      });
  }

  /* -------------------------------------------------------------- people */

  addPerson(): void {
    this.staffDraft.set({ id: null, name: '', role: '', active: true });
  }

  editPerson(person: BookingStaff): void {
    this.staffDraft.set({
      id: person.id,
      name: person.name,
      role: person.role ?? '',
      active: person.active,
    });
  }

  savePerson(): void {
    const draft = this.staffDraft();
    if (!draft || !draft.name.trim()) {
      this.toast.error('A name is needed');
      return;
    }
    const input = { name: draft.name.trim(), role: draft.role.trim(), active: draft.active };
    this.working.set(true);
    const done = {
      next: () => {
        this.working.set(false);
        this.staffDraft.set(null);
        this.load();
      },
      error: () => this.working.set(false),
    };
    if (draft.id) this.bookings.updateStaff(draft.id, input).subscribe(done);
    else this.bookings.createStaff(input).subscribe(done);
  }

  removePerson(person: BookingStaff): void {
    this.confirm
      .ask({
        title: `Remove ${person.name}?`,
        message: 'Their free slots go too. Booked appointments stop this — cancel those first.',
        confirmText: 'Remove',
        variant: 'danger',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.bookings.deleteStaff(person.id).subscribe({
          next: () => {
            this.toast.success('Removed');
            this.load();
          },
        });
      });
  }

  /* --------------------------------------------------------------- slots */

  togglePlanStaff(id: number): void {
    const chosen = this.planStaff();
    this.planStaff.set(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
  }

  toggleWeekday(day: number): void {
    const chosen = this.planWeekdays();
    this.planWeekdays.set(chosen.includes(day) ? chosen.filter((x) => x !== day) : [...chosen, day]);
  }

  addSlots(): void {
    const people = this.planStaff().length ? this.planStaff() : this.activeStaff().map((s) => s.id);
    if (!people.length) {
      this.toast.error('Add a person first', 'Slots belong to whoever takes the appointment.');
      return;
    }
    this.working.set(true);
    this.bookings
      .addSlots({
        staffIds: people,
        fromDate: this.planFrom,
        toDate: this.planTo,
        startTime: this.planStart,
        endTime: this.planEnd,
        durationMinutes: this.planMinutes,
        weekdays: this.planWeekdays(),
      })
      .subscribe({
        next: (result) => {
          this.working.set(false);
          this.toast.success(
            `${result.added} slot${result.added === 1 ? '' : 's'} added`,
            result.alreadyThere ? `${result.alreadyThere} were already there` : undefined,
          );
          this.load();
        },
        error: () => this.working.set(false),
      });
  }

  blockSlot(slot: BookingSlot, blocked: boolean): void {
    this.bookings.setBlocked(slot.id, blocked).subscribe({
      next: () => this.load(),
    });
  }

  deleteSlot(slot: BookingSlot): void {
    this.bookings.deleteSlot(slot.id).subscribe({
      next: () => this.load(),
    });
  }

  cancelBooking(slot: BookingSlot): void {
    this.confirm
      .ask({
        title: 'Cancel this appointment?',
        message: `${slot.customerName ?? 'The customer'} loses the ${this.timeLabel(slot.time)} slot, and it goes back on offer.`,
        confirmText: 'Cancel booking',
        variant: 'danger',
      })
      .subscribe((yes) => {
        if (!yes) return;
        this.bookings.cancelBooking(slot.id).subscribe({
          next: () => {
            this.toast.success('Booking cancelled', 'The slot is free again.');
            this.load();
          },
        });
      });
  }

  /* -------------------------------------------------------------- labels */

  recordLink(slot: BookingSlot): string[] | null {
    const form = this.forms().find((f) => f.id === this.page()?.formId);
    if (!form || !slot.recordId) return null;
    return ['/app/records', form.slug, slot.recordId];
  }

  timeLabel(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  private dayLabel(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);
    if (isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
