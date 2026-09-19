import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';

interface PublicSlot {
  id: number;
  time: string;
  label: string;
  durationMinutes: number;
  staffId: number;
  staffName: string;
  staffRole: string | null;
}

interface PublicDay {
  date: string;
  label: string;
  slots: PublicSlot[];
}

interface PublicBookingPage {
  title: string | null;
  tagline: string | null;
  note: string | null;
  services: string[];
  days: PublicDay[];
}

interface BookingResult {
  ok: boolean;
  when: string;
  staffName: string | null;
  service: string | null;
  message: string;
}

/**
 * The page a customer books from (/book/:key). No login.
 *
 * <p>It shows nothing but slots that are still free: the list comes from the
 * salon's own diary, and confirming one claims it on the server, so two people
 * tapping the same time never both get it — the second is told and picks again.
 *
 * <p>Plain HttpClient rather than CrmApiService, so the auth interceptor never
 * sends an anonymous visitor to /login.
 */
@Component({
  selector: 'app-public-booking',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-booking.component.html',
  styleUrl: './public-booking.component.css',
})
export class PublicBookingComponent {
  private readonly http = inject(HttpClient);

  readonly key = input.required<string>();

  readonly page = signal<PublicBookingPage | null>(null);
  readonly notFound = signal(false);
  readonly loading = signal(true);

  readonly activeDay = signal<string | null>(null);
  readonly chosen = signal<PublicSlot | null>(null);

  readonly booking = signal(false);
  readonly error = signal('');
  readonly done = signal<BookingResult | null>(null);

  name = '';
  phone = '';
  service = '';
  note = '';

  readonly days = computed(() => this.page()?.days ?? []);

  readonly visibleSlots = computed(() => {
    const day = this.days().find((d) => d.date === this.activeDay());
    return day?.slots ?? [];
  });

  readonly chosenDayLabel = computed(() => {
    const date = this.activeDay();
    return this.days().find((d) => d.date === date)?.label ?? '';
  });

  /**
   * Not a computed: the name and phone come from plain ngModel fields, and a
   * computed would cache its answer until a signal changed — leaving the
   * confirm button disabled while the customer typed.
   */
  ready(): boolean {
    return !!this.chosen() && !!this.name.trim() && !!this.phone.trim();
  }

  constructor() {
    effect(() => {
      const key = this.key();
      if (!key) return;
      this.loading.set(true);
      this.http
        .get<{ data: PublicBookingPage }>(
          `${environment.crmBaseUrl}/api/public/booking/${encodeURIComponent(key)}`,
        )
        .subscribe({
          next: (res) => {
            this.page.set(res.data);
            this.activeDay.set(res.data?.days?.[0]?.date ?? null);
            this.loading.set(false);
          },
          error: () => {
            this.notFound.set(true);
            this.loading.set(false);
          },
        });
    });
  }

  chooseDay(date: string): void {
    this.activeDay.set(date);
    // A slot from another day would quietly stay selected otherwise.
    if (this.chosen() && !this.visibleSlots().some((slot) => slot.id === this.chosen()!.id)) {
      this.chosen.set(null);
    }
  }

  chooseSlot(slot: PublicSlot): void {
    this.chosen.set(this.chosen()?.id === slot.id ? null : slot);
    this.error.set('');
  }

  confirm(): void {
    const slot = this.chosen();
    if (!slot) return;
    if (!this.name.trim() || !this.phone.trim()) {
      this.error.set('Please add your name and phone number.');
      return;
    }
    this.booking.set(true);
    this.error.set('');
    this.http
      .post<{ data: BookingResult }>(
        `${environment.crmBaseUrl}/api/public/booking/${encodeURIComponent(this.key())}/book`,
        {
          slotId: slot.id,
          name: this.name.trim(),
          phone: this.phone.trim(),
          service: this.service || null,
          note: this.note.trim() || null,
        },
      )
      .subscribe({
        next: (res) => {
          this.booking.set(false);
          this.done.set(res.data);
        },
        error: (err) => {
          this.booking.set(false);
          const message = err?.error?.message;
          this.error.set(message || 'That did not go through — please try another slot.');
          // Whatever went wrong, the list is stale: fetch the free slots again.
          this.reload();
        },
      });
  }

  bookAnother(): void {
    this.done.set(null);
    this.chosen.set(null);
    this.note = '';
    this.reload();
  }

  private reload(): void {
    this.http
      .get<{ data: PublicBookingPage }>(
        `${environment.crmBaseUrl}/api/public/booking/${encodeURIComponent(this.key())}`,
      )
      .subscribe({
        next: (res) => {
          this.page.set(res.data);
          const stillThere = res.data?.days?.some((day) => day.date === this.activeDay());
          if (!stillThere) this.activeDay.set(res.data?.days?.[0]?.date ?? null);
          if (this.chosen() && !this.visibleSlots().some((slot) => slot.id === this.chosen()!.id)) {
            this.chosen.set(null);
          }
        },
        error: () => { /* the page already says what went wrong */ },
      });
  }
}
