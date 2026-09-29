import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ToastService } from '../../../core/services/toast.service';
import { FieldService } from '../../fields/field.service';
import { FormService } from '../../forms/form.service';
import { StageService } from '../../stages/stage.service';
import { WhatsAppService } from '../whatsapp.service';
import { WhatsAppCampaignCreateComponent } from './campaign-create.component';

/**
 * A campaign could only be aimed at a whole form. Wanting "the leads that
 * reached Demo Booked last week" meant exporting a CSV by hand and uploading
 * it, because the field filters reach only inside a record's data — the stage
 * a record sits in and the day it was created are columns on the record.
 */
describe('Campaign wizard — narrowing the record audience', () => {
  let createCampaign: jasmine.Spy;
  let stagesFor: jasmine.Spy;
  let warned: jasmine.Spy;

  const build = () => {
    const component = TestBed.createComponent(WhatsAppCampaignCreateComponent).componentInstance;
    component.sourceType = 'RECORDS';
    component.selectedFormId = 5;
    component.phoneFieldKey = 'mobile';
    component.name = 'Diwali offer';
    component.messageMode = 'text';
    component.messageText = 'Hello';
    return component;
  };

  /** The body the wizard posted to the campaigns endpoint. */
  const sentPayload = () => createCampaign.calls.mostRecent().args[0];

  beforeEach(async () => {
    createCampaign = jasmine.createSpy('createCampaign').and.returnValue(of({ id: 6 }));
    stagesFor = jasmine.createSpy('getByForm').and.returnValue(
      of([
        { id: 9, formId: 5, name: 'Demo Booked', sequence: 2 },
        { id: 10, formId: 5, name: 'Closed', sequence: 3 },
      ]),
    );
    warned = jasmine.createSpy('warning');

    await TestBed.configureTestingModule({
      imports: [WhatsAppCampaignCreateComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: WhatsAppService,
          useValue: {
            getTemplates: () => of([]),
            getConfig: () => of({ messagingLimit: null }),
            createCampaign,
            uploadCampaignCsv: () => of({ id: 6 }),
          },
        },
        { provide: FormService, useValue: { getAll: () => of([{ id: 5, name: 'Leads', slug: 'leads' }]) } },
        { provide: FieldService, useValue: { getByForm: () => of([{ id: 1, fieldKey: 'mobile', label: 'Mobile' }]) } },
        { provide: StageService, useValue: { getByForm: stagesFor } },
        {
          provide: ToastService,
          useValue: { success: () => {}, warning: warned, error: () => {} },
        },
      ],
    }).compileComponents();
  });

  // --------------------------------------------------------------- stages

  it('loads the stages of the form that was picked', () => {
    const component = build();

    component.onFormPicked();

    expect(stagesFor).toHaveBeenCalledWith(5);
    expect(component.stages().length).toBe(2);
  });

  it('drops a stage chosen for a different form', () => {
    const component = build();
    component.stageId = 9;

    component.selectedFormId = 6;
    component.onFormPicked();

    // Stage ids belong to one form, so keeping it would match nothing and the
    // campaign would come back empty with no reason given.
    expect(component.stageId).toBeNull();
  });

  // -------------------------------------------------------------- payload

  it('sends the stage and the date range with the campaign', () => {
    const component = build();
    component.stageId = 9;
    component.createdFrom = '2026-09-01';
    component.createdTo = '2026-09-30';

    component.createDraft(false);

    expect(sentPayload().stageId).toBe(9);
    expect(sentPayload().createdFrom).toBe('2026-09-01');
    expect(sentPayload().createdTo).toBe('2026-09-30');
  });

  it('sends nothing extra when the whole form is the audience', () => {
    build().createDraft(false);

    expect(sentPayload().stageId).toBeUndefined();
    expect(sentPayload().createdFrom).toBeUndefined();
    expect(sentPayload().createdTo).toBeUndefined();
  });

  it('leaves a CSV campaign alone', () => {
    const component = build();
    component.sourceType = 'CSV';
    component.csvFile = new File(['phone\n919812345678'], 'a.csv');
    component.stageId = 9;
    component.createdFrom = '2026-09-01';

    component.createDraft(false);

    // A CSV audience has no form behind it, so a stage would be meaningless.
    expect(sentPayload().stageId).toBeUndefined();
    expect(sentPayload().createdFrom).toBeUndefined();
  });

  // ----------------------------------------------------------- validation

  it('stops a backwards date range at the wizard', () => {
    const component = build();
    component.createdFrom = '2026-09-30';
    component.createdTo = '2026-09-01';

    component.next();

    // Backwards dates match nothing, and an empty audience is only refused
    // after the campaign has already been created.
    expect(warned).toHaveBeenCalled();
    expect(component.step()).toBe(1);
  });

  it('lets a sensible range through', () => {
    const component = build();
    component.createdFrom = '2026-09-01';
    component.createdTo = '2026-09-30';

    component.next();

    expect(component.step()).toBe(2);
  });

  it('lets a single open-ended date through', () => {
    const component = build();
    component.createdFrom = '2026-09-01';

    component.next();

    expect(component.step()).toBe(2);
  });
});
