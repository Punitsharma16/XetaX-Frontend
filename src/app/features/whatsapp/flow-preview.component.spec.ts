import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FieldResponse, FieldType } from '../../core/models/crm.model';
import { FlowPreviewComponent } from './flow-preview.component';

/**
 * The preview promises the user "this is what will be generated", so its
 * splitting rules must be the ones WhatsAppFlowBuilder actually uses. The
 * screen counts below were taken from the real builder — if the backend's
 * PER_SCREEN or MAX_SCREENS ever changes, these fail and the preview stops
 * quietly lying about what Meta will get.
 */
describe('FlowPreviewComponent', () => {

  let fixture: ComponentFixture<FlowPreviewComponent>;
  let component: FlowPreviewComponent;

  const field = (key: string, type: FieldType = 'TEXT' as FieldType,
                 extra: Partial<FieldResponse> = {}): FieldResponse => ({
    id: 1, formId: 1, fieldKey: key, label: key, fieldType: type, ...extra,
  }) as FieldResponse;

  const fields = (count: number) =>
    Array.from({ length: count }, (_, i) => field('f' + i));

  const setFields = (list: FieldResponse[], formName = 'Book a demo') => {
    fixture.componentRef.setInput('fields', list);
    fixture.componentRef.setInput('formName', formName);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FlowPreviewComponent] }).compileComponents();
    fixture = TestBed.createComponent(FlowPreviewComponent);
    component = fixture.componentInstance;
  });

  describe('splitting questions across screens', () => {

    // Exactly the table the real WhatsAppFlowBuilder produces.
    const expected: [number, number][] = [
      [1, 1], [6, 1], [7, 1], [8, 1], [9, 2], [12, 2], [13, 3], [14, 3], [48, 8],
    ];

    for (const [count, screens] of expected) {
      it(`puts ${count} questions on ${screens} screen${screens === 1 ? '' : 's'}`, () => {
        setFields(fields(count));
        expect(component.screens().length).toBe(screens);
      });
    }

    it('flags a form too long to be a Flow', () => {
      setFields(fields(49));
      expect(component.screens().length).toBeGreaterThan(component.max);
      expect(component.tooLong()).toBeTrue();
    });

    it('stays within the limit at the boundary', () => {
      setFields(fields(48));
      expect(component.tooLong()).toBeFalse();
    });
  });

  describe('which fields become questions', () => {

    it('leaves out the types WhatsApp has no control for', () => {
      setFields([
        field('name'),
        field('resume', 'FILE' as FieldType),
        field('tags', 'MULTI_SELECT' as FieldType),
        field('secret', 'PASSWORD' as FieldType),
        field('email', 'EMAIL' as FieldType),
      ]);
      expect(component.usable().map((f) => f.fieldKey)).toEqual(['name', 'email']);
      expect(component.skipped()).toEqual(['resume', 'tags', 'secret']);
    });

    it('leaves out hidden fields', () => {
      setFields([field('name'), field('internal', 'TEXT' as FieldType, { hidden: true })]);
      expect(component.usable().map((f) => f.fieldKey)).toEqual(['name']);
    });

    it('says so when nothing is left to ask', () => {
      setFields([field('resume', 'FILE' as FieldType)]);
      expect(component.usable().length).toBe(0);
    });
  });

  describe('the control each field turns into', () => {

    const kindOf = (type: string, extra: Partial<FieldResponse> = {}) => {
      setFields([field('f', type as FieldType, extra)]);
      return component.screens()[0][0].kind;
    };

    it('matches the builder', () => {
      expect(kindOf('TEXTAREA')).toBe('textarea');
      expect(kindOf('DATE')).toBe('date');
      expect(kindOf('DATETIME')).toBe('date');
      expect(kindOf('BOOLEAN')).toBe('optin');
      expect(kindOf('CHECKBOX')).toBe('optin');
      expect(kindOf('EMAIL')).toBe('text');
      expect(kindOf('NUMBER')).toBe('text');
      expect(kindOf('SELECT', { optionsJson: '["A","B"]' })).toBe('choice');
      expect(kindOf('RADIO', { optionsJson: '["A"]' })).toBe('choice');
    });

    it('reads the options of a choice field', () => {
      setFields([field('plan', 'SELECT' as FieldType, { optionsJson: '["Basic","Pro","Max"]' })]);
      expect(component.screens()[0][0].options).toEqual(['Basic', 'Pro', 'Max']);
      expect(component.screens()[0][0].problem).toBeNull();
    });

    it('warns about a choice field with no options, which Meta refuses', () => {
      setFields([field('plan', 'SELECT' as FieldType)]);
      expect(component.screens()[0][0].problem).toContain('no options');
      expect(component.problems().length).toBe(1);
    });

    it('carries the required flag through', () => {
      setFields([field('name', 'TEXT' as FieldType, { required: true })]);
      expect(component.screens()[0][0].required).toBeTrue();
    });
  });

  describe('screen titles', () => {

    it('is just the form name when there is one screen', () => {
      setFields(fields(3), 'Book a demo');
      expect(component.screenTitle(0)).toBe('Book a demo');
    });

    it('is numbered when the form is split', () => {
      setFields(fields(13), 'Book a demo');
      expect(component.screenTitle(0)).toBe('Book a demo 1/3');
      expect(component.screenTitle(2)).toBe('Book a demo 3/3');
    });

    it('falls back when the form has no name', () => {
      setFields(fields(2), '');
      expect(component.screenTitle(0)).toBe('Details');
    });

    it('stays inside the 30 characters Meta allows', () => {
      setFields(fields(13), 'A very long form name that will certainly not fit');
      expect(component.screenTitle(0).length).toBeLessThanOrEqual(30);
    });
  });

  it('shows nothing until a form is picked', () => {
    setFields([]);
    expect(component.screens().length).toBe(0);
  });
});
