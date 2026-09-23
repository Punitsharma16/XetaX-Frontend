import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { TemplateService } from '../../forms/template.service';
import { WhatsAppService, WhatsAppTemplate } from '../whatsapp.service';
import { WhatsAppSettingsComponent } from './whatsapp-settings.component';

/**
 * Meta replaces every component when a template is edited, so the form has to
 * open holding the whole template. Anything this fails to read back is
 * silently dropped from the template the moment the owner saves a one-word
 * change — the header, the footer, the buttons.
 */
describe('Editing a message template', () => {

  let component: WhatsAppSettingsComponent;
  let updated: { id: number; request: any } | null;

  const template = (over: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate => ({
    id: 11,
    name: 'order_update',
    language: 'en',
    category: 'UTILITY',
    status: 'APPROVED',
    headerFormat: 'TEXT',
    headerMediaUrl: null,
    rejectionReason: null,
    componentsJson: JSON.stringify([
      { type: 'HEADER', format: 'TEXT', text: 'Hi {{1}}', example: { header_text: ['Asha'] } },
      { type: 'BODY', text: 'Your order {{1}} ships on {{2}}.', example: { body_text: [['A-1', 'Monday']] } },
      { type: 'FOOTER', text: 'Reply STOP to opt out' },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'URL', text: 'Track', url: 'https://x.test/{{1}}', example: ['https://x.test/A-1'] },
          { type: 'PHONE_NUMBER', text: 'Call us', phone_number: '+919000000000' },
          { type: 'FLOW', text: 'Open form', flow_id: '4398428720470405', flow_action: 'navigate' },
        ],
      },
    ]),
    ...over,
  });

  beforeEach(async () => {
    updated = null;
    await TestBed.configureTestingModule({
      imports: [WhatsAppSettingsComponent],
      providers: [
        provideRouter([]),
        {
          provide: WhatsAppService,
          useValue: {
            getConfig: () => of(null),
            getTemplates: () => of([]),
            getSignupMeta: () => of({ configured: false }),
            flows: () => of([]),
            usage: () => of({}),
            syncTemplates: () => of([]),
            updateTemplate: (id: number, request: any) => {
              updated = { id, request };
              return of({ ...template(), status: 'PENDING' });
            },
            createTemplate: () => of(template()),
          },
        },
        { provide: ToastService, useValue: { success: () => {}, warning: () => {}, error: () => {} } },
        { provide: ConfirmService, useValue: { confirmDelete: () => of(false), ask: () => of(false) } },
        { provide: TemplateService, useValue: { drafts: () => of([]) } },
      ],
    }).compileComponents();

    component = TestBed.createComponent(WhatsAppSettingsComponent).componentInstance;
  });

  it('opens holding everything the template already says', () => {
    component.editTemplate(template());

    expect(component.tplName).toBe('order_update');
    expect(component.tplLanguage).toBe('en');
    expect(component.tplCategory).toBe('UTILITY');
    expect(component.tplHeaderType).toBe('TEXT');
    expect(component.tplHeader).toBe('Hi {{1}}');
    expect(component.tplHeaderExample).toBe('Asha');
    expect(component.tplBody).toBe('Your order {{1}} ships on {{2}}.');
    expect(component.tplExamples).toBe('A-1, Monday');
    expect(component.tplFooter).toBe('Reply STOP to opt out');
  });

  it('brings every button back, including the Flow behind one', () => {
    component.editTemplate(template());

    expect(component.tplButtons.length).toBe(3);
    const flow = component.tplButtons.find((b) => b.type === 'FLOW')!;
    expect(flow.text).toBe('Open form');
    expect(flow.flowId).toBe('4398428720470405');
    expect(flow.flowAction).toBe('navigate');

    const url = component.tplButtons.find((b) => b.type === 'URL')!;
    expect(url.url).toBe('https://x.test/{{1}}');
    expect(url.urlExample).toBe('https://x.test/A-1');

    const call = component.tplButtons.find((b) => b.type === 'PHONE_NUMBER')!;
    expect(call.phoneNumber).toBe('+919000000000');
  });

  it('saves through the edit endpoint, not by creating a second template', () => {
    component.editTemplate(template());
    component.tplBody = 'Your order {{1}} ships on {{2}}. Thank you.';

    component.submitTemplate();

    expect(updated).withContext('the edit endpoint was used').not.toBeNull();
    expect(updated!.id).toBe(11);
    expect(updated!.request.bodyText).toContain('Thank you.');
    expect(updated!.request.buttons.length).toBe(3);
  });

  it('offers the edit only where Meta allows one', () => {
    expect(component.canEditTemplate(template({ status: 'APPROVED' }))).toBeTrue();
    expect(component.canEditTemplate(template({ status: 'REJECTED' }))).toBeTrue();
    expect(component.canEditTemplate(template({ status: 'PAUSED' }))).toBeTrue();
    expect(component.canEditTemplate(template({ status: 'PENDING' }))).toBeFalse();
    expect(component.canEditTemplate(template({ status: null }))).toBeFalse();
  });

  it('locks the category only for a template Meta has approved', () => {
    component.editTemplate(template({ status: 'APPROVED' }));
    expect(component.categoryLocked()).toBeTrue();

    component.editTemplate(template({ status: 'REJECTED' }));
    expect(component.categoryLocked()).toBeFalse();
  });

  it('leaves no edit hanging over the next new template', () => {
    component.editTemplate(template());
    component.openTemplateModal();

    expect(component.tplEditing()).toBeNull();
    expect(component.tplName).toBe('');
    expect(component.tplButtons).toEqual([]);
  });

  it('survives a template whose components are missing or unreadable', () => {
    expect(() => component.editTemplate(template({ componentsJson: null }))).not.toThrow();
    expect(() => component.editTemplate(template({ componentsJson: 'not json' }))).not.toThrow();
    expect(component.tplBody).toBe('');
  });
});
