import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { environment } from '../../../../environments/environment';
import { FlowSubmission, WhatsAppFlow } from '../whatsapp.service';
import { WhatsAppFlowsComponent } from './flows.component';

/**
 * Submissions whose record failed (e.g. the old "Unknown field : PHONE") keep
 * their answers, so the owner can create the record once the cause is fixed.
 */
describe('WhatsAppFlowsComponent — retrying a record', () => {

  let fixture: ComponentFixture<WhatsAppFlowsComponent>;
  let component: WhatsAppFlowsComponent;
  let http: HttpTestingController;
  const api = (path: string) => `${environment.crmBaseUrl}${path}`;

  const flow = { id: 5, name: 'flow_xeta', status: 'PUBLISHED', formId: 3 } as WhatsAppFlow;
  const failed: FlowSubmission = {
    id: 40, flowId: 5, flowName: 'flow_xeta', customerPhone: '919034908543', conversationId: 1,
    answers: { name: 'PUNIT SHARMA', phone: '9034908545' }, recordId: null,
    note: 'Submitted — could not create the record: Unknown field : PHONE', submittedAt: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsAppFlowsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WhatsAppFlowsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    http.match(() => true).forEach((request) => {
      const url = request.request.url;
      if (url.endsWith('/api/whatsapp/flows')) request.flush({ data: [flow] });
      else if (url.endsWith('/flows/options')) request.flush({ data: { categories: ['LEAD_GENERATION'] } });
      else request.flush({ data: [] });
    });
    component.responses.set([failed]);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('offers a retry only where one can help', () => {
    expect(component.canRetry(failed)).toBeTrue();
    expect(component.canRetry({ ...failed, recordId: 'rec-1' })).toBeFalse();
    expect(component.canRetry({ ...failed, answers: {} })).toBeFalse();
    expect(component.canRetry({ ...failed, flowId: 99 })).toBeFalse();
  });

  it('turns the row green once the record exists', () => {
    component.retryRecord(failed);
    const request = http.expectOne(api('/api/whatsapp/flows/responses/40/record'));
    expect(request.request.method).toBe('POST');
    request.flush({ data: { ...failed, recordId: 'rec-1', note: 'Submitted — record created' } });

    expect(component.responses()[0].recordId).toBe('rec-1');
    expect(component.retrying()).toBeNull();
  });

  it('keeps the button when the record still fails', () => {
    component.retryRecord(failed);
    http.expectOne(api('/api/whatsapp/flows/responses/40/record'))
      .flush({ data: { ...failed, note: 'Submitted — could not create the record: name is required' } });
    expect(component.canRetry(component.responses()[0])).toBeTrue();
    expect(component.responses()[0].note).toContain('name is required');
  });
});
