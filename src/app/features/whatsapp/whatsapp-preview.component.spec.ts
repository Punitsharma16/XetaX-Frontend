import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemplateButton } from './whatsapp.service';
import { WhatsAppPreviewComponent } from './whatsapp-preview.component';

/**
 * The preview is what the writer trusts before paying a day for Meta's review,
 * so two things must hold: the example values shown are the ones that will be
 * submitted, and a variable with no example is visibly marked rather than
 * quietly rendered as if it were fine.
 */
describe('WhatsAppPreviewComponent', () => {

  let fixture: ComponentFixture<WhatsAppPreviewComponent>;
  let component: WhatsAppPreviewComponent;

  const set = (inputs: Record<string, unknown>) => {
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WhatsAppPreviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(WhatsAppPreviewComponent);
    component = fixture.componentInstance;
  });

  describe('filling the body', () => {

    it('drops the example values into their places', () => {
      set({ body: 'Hi {{1}}, order {{2}} shipped.', examples: 'Asha, ORD-1042' });
      expect(component.bodyHtml()).toBe('Hi Asha, order ORD-1042 shipped.');
    });

    it('marks a variable that has no example yet', () => {
      set({ body: 'Hi {{1}}', examples: '' });
      expect(component.bodyHtml()).toContain('wp__var');
      expect(component.bodyHtml()).toContain('{{1}}');
    });

    it('counts what is still missing', () => {
      set({ body: 'Hi {{1}} and {{2}}', examples: 'Asha' });
      expect(component.missingExamples()).toBe(1);
      set({ examples: 'Asha, ORD-1' });
      expect(component.missingExamples()).toBe(0);
    });

    it('counts a text header variable with no example', () => {
      set({ body: 'Hello', examples: '', headerType: 'TEXT', headerText: 'Order {{1}}', headerExample: '' });
      expect(component.missingExamples()).toBe(1);
      set({ headerExample: 'ORD-1' });
      expect(component.missingExamples()).toBe(0);
    });

    it('counts missing card values too', () => {
      set({
        body: 'Deals', examples: '', carousel: true,
        cards: [{ body: 'For {{1}}', examples: '', mediaUrl: '' },
                { body: 'For {{1}}', examples: 'Asha', mediaUrl: '' }],
      });
      expect(component.missingExamples()).toBe(1);
    });

    it('shows WhatsApp bold and italics the way the phone will', () => {
      set({ body: 'This is *bold* and _soft_', examples: '' });
      expect(component.bodyHtml()).toContain('<b>bold</b>');
      expect(component.bodyHtml()).toContain('<i>soft</i>');
    });

    it('escapes what the user typed, so text can never become markup', () => {
      set({ body: 'Hi <img src=x onerror=alert(1)> {{1}}', examples: '<b>Asha</b>' });
      const html = component.bodyHtml();
      expect(html).toContain('&lt;img');
      expect(html).not.toContain('<img');
      expect(html).toContain('&lt;b&gt;Asha&lt;/b&gt;');
    });
  });

  describe('the header', () => {

    it('shows a text header only when there is text', () => {
      set({ headerType: 'TEXT', headerText: 'Order update' });
      expect(component.headerKind()).toBe('text');
      set({ headerText: '' });
      expect(component.headerKind()).toBe('none');
    });

    it('knows each media kind', () => {
      set({ headerType: 'IMAGE' });
      expect(component.headerKind()).toBe('image');
      set({ headerType: 'VIDEO' });
      expect(component.headerKind()).toBe('video');
      set({ headerType: 'DOCUMENT' });
      expect(component.headerKind()).toBe('document');
      set({ headerType: 'NONE' });
      expect(component.headerKind()).toBe('none');
    });

    it('fills the header variable from its own example', () => {
      set({ headerType: 'TEXT', headerText: 'Order {{1}}', headerExample: 'ORD-9' });
      expect(component.filled('Order {{1}}')).toBe('Order ORD-9');
    });

    it('has no header at all on an OTP template', () => {
      set({ category: 'AUTHENTICATION', headerType: 'IMAGE' });
      expect(component.authentication()).toBeTrue();
      expect(component.headerKind()).toBe('none');
    });
  });

  describe('buttons', () => {

    it('gives each kind its own icon', () => {
      expect(component.icon({ type: 'URL', text: 'Go' } as TemplateButton)).toContain('box-arrow');
      expect(component.icon({ type: 'PHONE_NUMBER', text: 'Call' } as TemplateButton)).toContain('telephone');
      expect(component.icon({ type: 'FLOW', text: 'Form' } as TemplateButton)).toContain('ui-checks');
      expect(component.icon({ type: 'QUICK_REPLY', text: 'Stop' } as TemplateButton)).toContain('reply');
    });
  });

  describe('what ends up on screen', () => {

    it('draws the filled body, not the raw template', () => {
      set({ body: 'Hi {{1}}', examples: 'Asha', footer: 'XetaX CRM' });
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Hi Asha');
      expect(text).toContain('XetaX CRM');
    });

    it('draws an OTP template as a code with a copy button', () => {
      set({ category: 'AUTHENTICATION', body: 'Your code' });
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Copy code');
    });

    it('draws one block per carousel card', () => {
      set({
        carousel: true,
        cards: [{ body: 'One', examples: '', mediaUrl: '' },
                { body: 'Two', examples: '', mediaUrl: '' }],
      });
      const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.wp__card');
      expect(cards.length).toBe(2);
    });
  });
});
