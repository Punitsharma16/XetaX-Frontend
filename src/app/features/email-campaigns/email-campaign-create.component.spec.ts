import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { EmailCampaignCreateComponent } from './email-campaign-create.component';

/**
 * Writing the mail is the work here, so the page offers to draft it. What
 * comes back has to land in the two fields the sender reviews — a draft that
 * is announced but not filled in is worse than none.
 */
describe('EmailCampaignCreateComponent — Draft with AI', () => {
  let fixture: ComponentFixture<EmailCampaignCreateComponent>;
  let component: EmailCampaignCreateComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailCampaignCreateComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmailCampaignCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    for (const request of http.match(() => true)) request.flush({ data: null });
  });

  const draftRequest = () => http.expectOne((r) => r.url.includes('/ai-draft'));

  it('fills the subject and the message from the answer', () => {
    component.aiPrompt = 'Diwali offer, 20% off till 5 Nov';

    component.draftWithAi();
    draftRequest().flush({ data: { subject: '20% off this Diwali', body: 'Hi {name}, our offer is live.' } });

    expect(component.subject).toBe('20% off this Diwali');
    expect(component.body).toBe('Hi {name}, our offer is live.');
    expect(component.aiDrafting()).toBeFalse();
  });

  it('asks for a brief before spending a message', () => {
    component.aiPrompt = '   ';

    component.draftWithAi();

    http.expectNone((r) => r.url.includes('/ai-draft'));
  });

  it('stops the spinner when the draft fails', () => {
    component.aiPrompt = 'Diwali offer';

    component.draftWithAi();
    draftRequest().flush({ message: 'The AI is busy' }, { status: 400, statusText: 'Bad Request' });

    expect(component.aiDrafting()).toBeFalse();
  });

  it('leaves what the sender already wrote untouched when nothing was asked', () => {
    component.subject = 'My own subject';
    component.aiPrompt = '';

    component.draftWithAi();

    expect(component.subject).toBe('My own subject');
  });
});
