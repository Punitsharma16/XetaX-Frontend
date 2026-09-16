import {
  emptyVariables,
  hasVariables,
  mergeInitial,
  templateSlots,
  templateVariableProblem,
  variablesComplete,
} from './template-variables.component';
import { TemplateVariables, WhatsAppTemplate } from './whatsapp.service';

/**
 * These rules exist twice — here and in the backend's
 * WhatsAppTemplateVariables — because the panel must refuse a send the server
 * would refuse anyway, before the user watches it fail. If the two ever drift,
 * a template send starts failing with a 400 that the form said was fine, so
 * the counts and shapes are pinned here.
 */
describe('template variables', () => {

  const template = (components: unknown[], extra: Partial<WhatsAppTemplate> = {}) => ({
    name: 't', language: 'en', status: 'APPROVED', category: 'UTILITY',
    componentsJson: JSON.stringify(components),
    ...extra,
  }) as WhatsAppTemplate;

  describe('reading a template', () => {

    it('counts the variables in the body', () => {
      const slots = templateSlots(template([{ type: 'BODY', text: 'Hi {{1}}, order {{2}} shipped.' }]));
      expect(slots?.bodyVars).toBe(2);
      expect(slots?.bodyText).toBe('Hi {{1}}, order {{2}} shipped.');
    });

    it('counts a text header separately from the body', () => {
      const slots = templateSlots(template([
        { type: 'HEADER', format: 'TEXT', text: 'Order {{1}}' },
        { type: 'BODY', text: 'Thanks' },
      ]));
      expect(slots?.headerVars).toBe(1);
      expect(slots?.bodyVars).toBe(0);
      expect(slots?.headerFormat).toBe('TEXT');
    });

    it('asks for a value only from the buttons that need one', () => {
      const slots = templateSlots(template([
        { type: 'BODY', text: 'Hi' },
        { type: 'BUTTONS', buttons: [
          { type: 'URL', text: 'Track', url: 'https://x.com/{{1}}' },
          { type: 'URL', text: 'Site', url: 'https://x.com' },
          { type: 'QUICK_REPLY', text: 'Stop' },
          { type: 'COPY_CODE', text: 'Copy' },
        ] },
      ]));
      expect(slots?.buttons.filter((b) => b.needsValue).map((b) => b.index)).toEqual([0, 3]);
    });

    it('reads every carousel card', () => {
      const card = (n: number) => ({ components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: `Card ${n} for {{1}}` },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Buy', url: 'https://x.com/{{1}}' }] },
      ] });
      const slots = templateSlots(template([
        { type: 'BODY', text: 'Deals for {{1}}' },
        { type: 'CAROUSEL', cards: [card(1), card(2)] },
      ]));
      expect(slots?.cards.length).toBe(2);
      expect(slots?.cards[1].bodyVars).toBe(1);
      expect(slots?.cards[0].buttons[0].needsValue).toBeTrue();
    });

    it('treats an OTP body as always carrying the code', () => {
      const slots = templateSlots(template(
        [{ type: 'BODY', text: 'Your code' }], { category: 'AUTHENTICATION' }));
      expect(slots?.authentication).toBeTrue();
      expect(slots?.bodyVars).toBe(1);
    });

    it('survives componentsJson that is not valid JSON', () => {
      const slots = templateSlots({ componentsJson: 'not json' } as WhatsAppTemplate);
      expect(slots?.bodyVars).toBe(0);
    });

    it('is null without a template', () => {
      expect(templateSlots(null)).toBeNull();
    });
  });

  describe('the blank set of values', () => {

    it('is shaped like the template', () => {
      const slots = templateSlots(template([
        { type: 'HEADER', format: 'TEXT', text: 'Hi {{1}}' },
        { type: 'BODY', text: 'Order {{1}} of {{2}}' },
        { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'Go', url: 'https://x/{{1}}' }] },
      ]));
      const values = emptyVariables(slots);
      expect(values.header.length).toBe(1);
      expect(values.body.length).toBe(2);
      expect(Object.keys(values.buttons)).toEqual(['0']);
    });

    it('does not ask for an OTP button separately from the code', () => {
      const slots = templateSlots(template([
        { type: 'BODY', text: 'Your code' },
        { type: 'BUTTONS', buttons: [{ type: 'OTP', text: 'Copy code' }] },
      ], { category: 'AUTHENTICATION' }));
      expect(Object.keys(emptyVariables(slots).buttons).length).toBe(0);
    });
  });

  describe('deciding whether a send may go', () => {

    const bodyTemplate = template([{ type: 'BODY', text: 'Hi {{1}} and {{2}}' }]);

    it('refuses while a value is blank', () => {
      const slots = templateSlots(bodyTemplate);
      const values = emptyVariables(slots);
      expect(variablesComplete(slots, bodyTemplate, values)).toBeFalse();
      values.body = ['Asha', 'ORD-1'];
      expect(variablesComplete(slots, bodyTemplate, values)).toBeTrue();
    });

    it('does not count whitespace as a value', () => {
      const slots = templateSlots(bodyTemplate);
      const values = emptyVariables(slots);
      values.body = ['Asha', '   '];
      expect(variablesComplete(slots, bodyTemplate, values)).toBeFalse();
    });

    it('refuses a media header with nothing to send', () => {
      const media = template([{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'Hello' }]);
      const slots = templateSlots(media);
      const values = emptyVariables(slots);
      expect(hasVariables(slots, media)).toBeTrue();
      expect(variablesComplete(slots, media, values)).toBeFalse();
      values.headerMediaUrl = 'https://x/y.jpg';
      expect(variablesComplete(slots, media, values)).toBeTrue();
    });

    it('needs nothing when the template already stores its header media', () => {
      const saved = template(
        [{ type: 'HEADER', format: 'IMAGE' }, { type: 'BODY', text: 'Hello' }],
        { headerMediaUrl: 'https://saved/y.jpg' } as Partial<WhatsAppTemplate>);
      const slots = templateSlots(saved);
      expect(variablesComplete(slots, saved, emptyVariables(slots))).toBeTrue();
    });

    it('will not let a half-filled carousel through', () => {
      const card = { components: [
        { type: 'HEADER', format: 'IMAGE' },
        { type: 'BODY', text: 'For {{1}}' },
      ] };
      const carousel = template([
        { type: 'BODY', text: 'Deals' },
        { type: 'CAROUSEL', cards: [card, card] },
      ]);
      const slots = templateSlots(carousel);
      const values = emptyVariables(slots);
      values.cards[0].body = ['x'];
      expect(variablesComplete(slots, carousel, values)).toBeFalse();
      values.cards[1].body = ['y'];
      expect(variablesComplete(slots, carousel, values)).toBeTrue();
    });

    it('rejects a card carrying the wrong number of values', () => {
      const carousel = template([
        { type: 'BODY', text: 'Deals' },
        { type: 'CAROUSEL', cards: [{ components: [{ type: 'BODY', text: 'For {{1}}' }] }] },
      ]);
      const slots = templateSlots(carousel);
      const values = emptyVariables(slots);
      values.cards[0].body = [];
      expect(variablesComplete(slots, carousel, values)).toBeFalse();
    });

    it('asks for nothing from a template with no variables', () => {
      const plain = template([{ type: 'BODY', text: 'Thanks for shopping!' }]);
      const slots = templateSlots(plain);
      expect(hasVariables(slots, plain)).toBeFalse();
      expect(variablesComplete(slots, plain, emptyVariables(slots))).toBeTrue();
    });
  });

  describe('keeping values across a template change', () => {

    it('keeps what still fits and drops what does not', () => {
      const slots = templateSlots(template([{ type: 'BODY', text: 'Hi {{1}} and {{2}}' }]));
      const base = emptyVariables(slots);
      const saved: TemplateVariables = {
        header: [], headerMediaUrl: '', body: ['Asha'], buttons: {}, cards: [],
      };
      const merged = mergeInitial(base, saved);
      expect(merged.body).toEqual(['Asha', '']);
    });

    it('returns the blank set when there is nothing saved', () => {
      const slots = templateSlots(template([{ type: 'BODY', text: 'Hi {{1}}' }]));
      const base = emptyVariables(slots);
      expect(mergeInitial(base, null)).toEqual(base);
    });
  });

  describe("Meta's rules for writing variables", () => {

    it('accepts well-formed text', () => {
      expect(templateVariableProblem('The body', 'Hi {{1}}, your order {{2}} shipped.', true)).toBeNull();
      expect(templateVariableProblem('The body', 'No variables at all', true)).toBeNull();
    });

    it('catches a gap in the numbering', () => {
      expect(templateVariableProblem('The body', 'Hi {{1}} and {{3}}', true))
        .toContain('{{2}} is missing');
    });

    it('catches two variables side by side', () => {
      expect(templateVariableProblem('The body', 'Hi {{1}} {{2}}', false))
        .toContain('side by side');
    });

    it('catches a body that starts or ends with a variable', () => {
      expect(templateVariableProblem('The body', '{{1}} is your order', true)).toContain("can't start or end");
      expect(templateVariableProblem('The body', 'Your order is {{1}}', true)).toContain("can't start or end");
    });

    it('allows a header to be nothing but a variable', () => {
      expect(templateVariableProblem('The header', '{{1}}', false)).toBeNull();
    });
  });
});
