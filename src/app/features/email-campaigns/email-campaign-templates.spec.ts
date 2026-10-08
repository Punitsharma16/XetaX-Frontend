import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { EmailCampaignCreateComponent } from './email-campaign-create.component';

/**
 * The wizard can start from a saved template or from text typed on the spot.
 * The two must not fight: picking a template fills the fields, editing them
 * breaks the link, and the campaign carries a templateId only while the text
 * is still the template's.
 */
describe('EmailCampaignCreateComponent — saved templates', () => {
  let fixture: ComponentFixture<EmailCampaignCreateComponent>;
  let component: EmailCampaignCreateComponent;
  let http: HttpTestingController;

  const TEMPLATES = [
    { id: 5, name: 'Diwali offer', subject: 'Template subject', body: 'Template body',
      createdAt: null, updatedAt: null },
    { id: 6, name: 'Holi offer', subject: 'Holi subject', body: 'Holi body',
      createdAt: null, updatedAt: null },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmailCampaignCreateComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmailCampaignCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Answers the page's own start-up calls, filling the template list. */
  function settle(templates: unknown[] = TEMPLATES): void {
    for (const request of http.match(() => true)) {
      request.flush({ data: request.request.url.includes('/api/email/templates') ? templates : null });
    }
  }

  function pick(id: number | null): void {
    component.selectedTemplateId = id;
    component.applyTemplate();
  }

  // ------------------------------------------------------------- loading

  it('loads the saved templates when the page opens', () => {
    settle();

    expect(component.templateList().length).toBe(2);
    expect(component.templateList()[0].name).toBe('Diwali offer');
  });

  it('survives a workspace that has no templates yet', () => {
    settle([]);

    expect(component.templateList()).toEqual([]);
  });

  // ------------------------------------------------------------ choosing

  it('fills the subject and the message from the chosen template', () => {
    settle();

    pick(5);

    expect(component.subject).toBe('Template subject');
    expect(component.body).toBe('Template body');
  });

  it('borrows the template name only while the campaign is unnamed', () => {
    settle();

    pick(5);
    expect(component.name).toBe('Diwali offer');

    component.name = 'My own name';
    pick(6);
    expect(component.name).toBe('My own name');
  });

  it('"Write it myself" leaves the text alone', () => {
    settle();
    component.subject = 'Typed subject';
    component.body = 'Typed body';

    pick(null);

    expect(component.subject).toBe('Typed subject');
    expect(component.body).toBe('Typed body');
    expect(component.usedTemplateId()).toBeNull();
  });

  // --------------------------------------------- editing breaks the link

  it('drops the template once the subject is edited', () => {
    settle();
    pick(5);
    expect(component.usedTemplateId()).toBe(5);

    component.subject = 'Edited subject';
    component.onMessageEdited();

    expect(component.usedTemplateId()).toBeNull();
    expect(component.selectedTemplateId).toBeNull();
  });

  it('drops the template when a placeholder is inserted', () => {
    settle();
    pick(5);

    component.appendPlaceholder('name');

    expect(component.body).toBe('Template body{name}');
    expect(component.usedTemplateId()).toBeNull();
  });

  it('drops the template when AI rewrites the message', () => {
    settle();
    pick(5);

    component.aiPrompt = 'Something else entirely';
    component.draftWithAi();
    http.expectOne((r) => r.url.includes('/ai-draft'))
      .flush({ data: { subject: 'AI subject', body: 'AI body' } });

    expect(component.usedTemplateId()).toBeNull();
  });

  // ------------------------------------------- what reaches the campaign

  it('sends the templateId while the text is still the template\'s', () => {
    settle();
    pick(5);
    component.name = 'October push';
    component.sourceType = 'CONTACTS';

    component.createDraft(false);

    const request = http.expectOne((r) => r.url.endsWith('/api/email/campaigns'));
    expect(request.request.body.templateId).toBe(5);
    expect(request.request.body.subject).toBe('Template subject');
  });

  it('sends no templateId once the text has been edited', () => {
    settle();
    pick(5);
    component.name = 'October push';
    component.sourceType = 'CONTACTS';
    component.body = 'Edited body';
    component.onMessageEdited();

    component.createDraft(false);

    const request = http.expectOne((r) => r.url.endsWith('/api/email/campaigns'));
    expect(request.request.body.templateId).toBeUndefined();
    expect(request.request.body.body).toBe('Edited body');
  });

  it('sends no templateId when nothing was picked at all', () => {
    settle();
    component.name = 'October push';
    component.subject = 'Typed subject';
    component.body = 'Typed body';
    component.sourceType = 'CONTACTS';

    component.createDraft(false);

    const request = http.expectOne((r) => r.url.endsWith('/api/email/campaigns'));
    expect(request.request.body.templateId).toBeUndefined();
  });

  // ------------------------------------------------------------- saving

  it('refuses to save a template with no message written', () => {
    settle();
    component.subject = 'Something';
    component.body = '   ';

    component.openSaveTemplate();

    expect(component.templateModalOpen()).toBeFalse();
  });

  it('offers the campaign name as the template name', () => {
    settle();
    component.name = 'October push';
    component.subject = 'S';
    component.body = 'B';

    component.openSaveTemplate();

    expect(component.templateModalOpen()).toBeTrue();
    expect(component.templateName).toBe('October push');
  });

  it('saves the current subject and message, and adds it to the picker', () => {
    settle();
    component.subject = 'New subject';
    component.body = 'New body';
    component.templateName = 'Reusable';

    component.saveTemplate();

    const request = http.expectOne((r) => r.url.endsWith('/api/email/templates') && r.method === 'POST');
    expect(request.request.body).toEqual({
      name: 'Reusable', subject: 'New subject', body: 'New body',
    });
    request.flush({ data: { id: 9, name: 'Reusable', subject: 'New subject', body: 'New body',
      createdAt: null, updatedAt: null } });

    expect(component.templateModalOpen()).toBeFalse();
    expect(component.templateList()[0].id).toBe(9);
    // Saving is not an edit, so the new template stays the source of the text.
    expect(component.usedTemplateId()).toBe(9);
  });

  it('refuses to save without a name', () => {
    settle();
    component.subject = 'S';
    component.body = 'B';
    component.templateName = '  ';

    component.saveTemplate();

    http.expectNone((r) => r.url.endsWith('/api/email/templates') && r.method === 'POST');
    expect(component.savingTemplate()).toBeFalse();
  });

  it('stops the spinner and keeps the dialog open when saving fails', () => {
    settle();
    component.subject = 'S';
    component.body = 'B';
    component.templateName = 'Reusable';
    component.templateModalOpen.set(true);

    component.saveTemplate();
    http.expectOne((r) => r.url.endsWith('/api/email/templates') && r.method === 'POST')
      .flush({ message: 'nope' }, { status: 400, statusText: 'Bad Request' });

    expect(component.savingTemplate()).toBeFalse();
    expect(component.templateModalOpen()).toBeTrue();
  });
});
