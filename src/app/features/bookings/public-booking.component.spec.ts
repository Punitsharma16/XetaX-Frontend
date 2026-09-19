import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PublicBookingComponent } from './public-booking.component';

/**
 * The page a customer books from. It may only ever offer slots the salon has
 * free, and when someone else takes the chosen one first, the page has to say
 * so and come back with a fresh list rather than pretend the booking worked.
 */
describe('PublicBookingComponent', () => {
  let fixture: ComponentFixture<PublicBookingComponent>;
  let component: PublicBookingComponent;
  let http: HttpTestingController;

  const page = {
    title: 'Glow Salon',
    tagline: 'Walk in, walk out glowing',
    note: 'Please arrive 5 minutes early.',
    services: ['Haircut', 'Hair Spa'],
    days: [
      {
        date: '2026-09-21',
        label: 'Sat, 21 Sep',
        slots: [
          { id: 11, time: '11:00:00', label: '11:00 AM', durationMinutes: 30, staffId: 7, staffName: 'Neha', staffRole: 'Senior stylist' },
          { id: 12, time: '11:30:00', label: '11:30 AM', durationMinutes: 30, staffId: 7, staffName: 'Neha', staffRole: 'Senior stylist' },
        ],
      },
      {
        date: '2026-09-22',
        label: 'Sun, 22 Sep',
        slots: [
          { id: 21, time: '10:00:00', label: '10:00 AM', durationMinutes: 30, staffId: 8, staffName: 'Riya', staffRole: null },
        ],
      },
    ],
  };

  const url = (path = '') => `${environment.crmBaseUrl}/api/public/booking/KEY${path}`;

  const create = () => {
    fixture = TestBed.createComponent(PublicBookingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('key', 'KEY');
    fixture.detectChanges();
    http.expectOne(url()).flush({ data: page });
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicBookingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('opens on the first day with free slots', () => {
    create();

    expect(component.activeDay()).toBe('2026-09-21');
    expect(component.visibleSlots().map((s) => s.id)).toEqual([11, 12]);
    expect(component.chosenDayLabel()).toBe('Sat, 21 Sep');
  });

  it('shows only the chosen day’s slots', () => {
    create();

    component.chooseDay('2026-09-22');

    expect(component.visibleSlots().map((s) => s.id)).toEqual([21]);
  });

  it('drops a slot picked on another day when the day changes', () => {
    create();
    component.chooseSlot(component.visibleSlots()[0]);

    component.chooseDay('2026-09-22');

    expect(component.chosen()).toBeNull();
  });

  it('will not confirm without a slot, a name and a phone number', () => {
    create();
    expect(component.ready()).toBeFalse();

    component.chooseSlot(component.visibleSlots()[0]);
    expect(component.ready()).toBeFalse();

    component.name = 'Priya';
    component.phone = '9896458807';
    expect(component.ready()).toBeTrue();
  });

  it('sends the slot id and the customer, and shows the confirmation', () => {
    create();
    component.chooseSlot(component.visibleSlots()[1]);
    component.name = ' Priya ';
    component.phone = ' 9896458807 ';
    component.service = 'Haircut';

    component.confirm();

    const request = http.expectOne(url('/book'));
    expect(request.request.body).toEqual({
      slotId: 12,
      name: 'Priya',
      phone: '9896458807',
      service: 'Haircut',
      note: null,
    });
    request.flush({
      data: { ok: true, when: 'Sat, 21 Sep at 11:30 AM', staffName: 'Neha', service: 'Haircut', message: 'Booked!' },
    });

    expect(component.done()?.when).toBe('Sat, 21 Sep at 11:30 AM');
    expect(component.error()).toBe('');
  });

  it('says so and reloads the free slots when the slot has just gone', () => {
    create();
    component.chooseSlot(component.visibleSlots()[0]);
    component.name = 'Priya';
    component.phone = '9896458807';

    component.confirm();
    http.expectOne(url('/book')).flush(
      { message: 'That slot has just been taken — please pick another one.' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(component.done()).toBeNull();
    expect(component.error()).toContain('just been taken');

    // The list it was showing is stale, so it asks for the free slots again.
    const fresh = { ...page, days: [{ ...page.days[0], slots: [page.days[0].slots[1]] }] };
    http.expectOne(url()).flush({ data: fresh });

    expect(component.visibleSlots().map((s) => s.id)).toEqual([12]);
    expect(component.chosen()).toBeNull();
  });

  it('shows nothing to book when the diary is full', () => {
    fixture = TestBed.createComponent(PublicBookingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('key', 'KEY');
    fixture.detectChanges();
    http.expectOne(url()).flush({ data: { ...page, days: [] } });
    fixture.detectChanges();

    expect(component.days().length).toBe(0);
    expect(component.activeDay()).toBeNull();
  });

  it('tells the visitor when the link is dead instead of failing silently', () => {
    fixture = TestBed.createComponent(PublicBookingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('key', 'KEY');
    fixture.detectChanges();
    http.expectOne(url()).flush({ message: 'gone' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    expect(component.notFound()).toBeTrue();
    expect(component.loading()).toBeFalse();
  });
});
