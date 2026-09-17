import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { Campaign } from '../whatsapp.service';
import { WhatsAppCampaignDetailComponent } from './campaign-detail.component';

/** The cost is asked for only while there is something left to send. */
describe('WhatsAppCampaignDetailComponent — cost estimate', () => {

  let fixture: ComponentFixture<WhatsAppCampaignDetailComponent>;
  let http: HttpTestingController;
  const api = (path: string) => `${environment.crmBaseUrl}${path}`;

  const campaign = (status: Campaign['status']) => ({
    id: 3, name: 'Diwali', sourceType: 'RECORDS', status, messageTemplate: null, templateName: 'promo',
    templateLanguage: 'en', targetDescription: null, scheduledAt: null, totalCount: 1000, queuedCount: 0,
    sentCount: 0, deliveredCount: 0, readCount: 0, failedCount: 0, createdAt: null, startedAt: null, completedAt: null,
  });

  const open = (status: Campaign['status']) => {
    fixture = TestBed.createComponent(WhatsAppCampaignDetailComponent);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();
    http.expectOne(api('/api/whatsapp/campaigns/3')).flush({ data: campaign(status) });
    http.match((r) => r.url.includes('/recipients')).forEach((r) =>
      r.flush({ data: { content: [], number: 0, size: 50, totalElements: 0, totalPages: 0 } }));
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsAppCampaignDetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('shows the cost of a draft before it is started', () => {
    open('DRAFT');
    http.expectOne(api('/api/whatsapp/campaigns/3/estimate')).flush({ data: {
      recipients: 1000, india: 1000, otherCountries: 0, category: 'MARKETING', templateCategory: 'MARKETING',
      rate: 0.8631, rateDate: '2026-10-02', amount: 863.1, currency: 'INR',
    } });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('up to ₹863.10');
  });

  for (const status of ['SCHEDULED', 'QUEUED', 'PAUSED'] as const) {
    it(`asks for the cost while ${status}`, () => {
      open(status);
      http.expectOne(api('/api/whatsapp/campaigns/3/estimate')).flush({ data: null });
    });
  }

  for (const status of ['COMPLETED', 'CANCELLED', 'FAILED'] as const) {
    it(`does not ask once ${status}`, () => {
      open(status);
      http.expectNone(api('/api/whatsapp/campaigns/3/estimate'));
      expect(fixture.componentInstance.estimate()).toBeNull();
    });
  }
});
