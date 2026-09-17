import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ConfirmService } from '../../../core/services/confirm.service';
import { WhatsAppRateRow } from '../platform.service';
import { PlatformConsoleComponent } from './platform-console.component';

/** The India rate card the estimates are built on. */
describe('PlatformConsoleComponent — WhatsApp rates', () => {

  let fixture: ComponentFixture<PlatformConsoleComponent>;
  let component: PlatformConsoleComponent;
  let http: HttpTestingController;
  let confirmAnswer: boolean;
  const api = (path: string) => `${environment.crmBaseUrl}${path}`;

  const rows: WhatsAppRateRow[] = [
    { id: 1, category: 'MARKETING', rate: 0.8631, effectiveFrom: '2025-07-01', note: null },
    { id: 2, category: 'UTILITY', rate: 0.115, effectiveFrom: '2025-07-01', note: null },
    { id: 3, category: 'UTILITY', rate: 0.13, effectiveFrom: '2099-01-01', note: 'future' },
    { id: 4, category: 'AUTHENTICATION', rate: 0.115, effectiveFrom: '2025-07-01', note: null },
  ];

  const flushStartup = () => {
    http.match(() => true).forEach((request) => {
      const url = request.request.url;
      if (url.endsWith('/whatsapp-rates')) request.flush({ data: rows });
      else if (url.endsWith('/overview')) request.flush({ data: null });
      else request.flush({ data: [] });
    });
  };

  beforeEach(async () => {
    confirmAnswer = true;
    await TestBed.configureTestingModule({
      imports: [PlatformConsoleComponent],
      providers: [
        provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ConfirmService, useValue: { ask: () => of(confirmAnswer), confirmDelete: () => of(confirmAnswer) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlatformConsoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    flushStartup();
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('marks the price in force, not the future one', () => {
    expect(component.ratesInForce().has(2)).toBeTrue();
    expect(component.ratesInForce().has(3)).toBeFalse();
    expect(component.ratesInForce().has(1)).toBeTrue();
  });

  it('lists every row', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('₹0.8631');
    expect(text).toContain('2099-01-01');
  });

  it('refuses to save without a rate or a date', () => {
    component.rateValue = null;
    component.rateFrom = '2026-10-01';
    component.saveRate();
    component.rateValue = 0.115;
    component.rateFrom = '';
    component.saveRate();
    http.expectNone(api('/api/platform/whatsapp-rates'));
  });

  it('saves a dated price and reloads the table', () => {
    component.rateCategory = 'MARKETING';
    component.rateValue = 0.95;
    component.rateFrom = '2027-01-01';
    component.rateNote = '  Q1 card  ';
    component.saveRate();

    const request = http.expectOne((r) => r.method === 'POST' && r.url === api('/api/platform/whatsapp-rates'));
    expect(request.request.body).toEqual({ category: 'MARKETING', rate: 0.95, effectiveFrom: '2027-01-01', note: 'Q1 card' });
    request.flush({ data: rows[0] });
    http.expectOne((r) => r.method === 'GET' && r.url === api('/api/platform/whatsapp-rates')).flush({ data: rows });
    expect(component.rateValue).toBeNull();
  });

  it('deletes only after confirmation', () => {
    confirmAnswer = false;
    component.deleteRate(rows[2]);
    http.expectNone(api('/api/platform/whatsapp-rates/3'));

    confirmAnswer = true;
    component.deleteRate(rows[2]);
    http.expectOne((r) => r.method === 'DELETE' && r.url === api('/api/platform/whatsapp-rates/3'))
      .flush({ message: 'Rate deleted' });
    http.expectOne((r) => r.method === 'GET' && r.url === api('/api/platform/whatsapp-rates')).flush({ data: rows });
  });
});
