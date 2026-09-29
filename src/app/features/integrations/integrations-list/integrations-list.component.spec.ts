import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { IntegrationResponse, IntegrationStatus, IntegrationType } from '../../../core/models/crm.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { FieldService } from '../../fields/field.service';
import { FormService } from '../../forms/form.service';
import { IntegrationService } from '../integration.service';
import { IntegrationsListComponent } from './integrations-list.component';

/**
 * Two gaps this pins.
 *
 * <p>An integration could not be turned off — DISABLED was in the enum but
 * nothing set it, so the only way to stop one was to delete it.
 *
 * <p>And a key with no mapping was dropped in silence: the sender saw 200 OK
 * and the record came out missing a field, with nothing on screen to say why.
 */
describe('IntegrationsListComponent — on/off and dropped keys', () => {
  let setStatus: jasmine.Spy;
  let confirmAnswer: boolean;

  const integration = (over: Partial<IntegrationResponse> = {}): IntegrationResponse =>
    ({
      id: 7,
      name: 'Website form',
      type: IntegrationType.GENERIC_WEBHOOK,
      formId: 5,
      status: IntegrationStatus.ACTIVE,
      integrationKey: 'key-1',
      apiKey: 'secret-1',
      endpoint: '/api/public/integrations/key-1',
      ...over,
    }) as IntegrationResponse;

  const build = () => {
    const fixture = TestBed.createComponent(IntegrationsListComponent);
    return fixture.componentInstance;
  };

  beforeEach(async () => {
    confirmAnswer = true;
    setStatus = jasmine.createSpy('setStatus').and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [IntegrationsListComponent],
      providers: [
        // The card links to /app/forms and embeds the AI panel, so the
        // component needs a router and an HTTP client even to be built.
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: IntegrationService,
          useValue: {
            getAll: () => of([]),
            getMappings: () => of([]),
            setStatus,
            webhookUrl: () => 'https://example.test/hook',
          },
        },
        { provide: FormService, useValue: { getAll: () => of([]) } },
        { provide: FieldService, useValue: { getByForm: () => of([]) } },
        {
          provide: ToastService,
          useValue: { success: () => {}, warning: () => {}, error: () => {} },
        },
        { provide: ConfirmService, useValue: { ask: () => of(confirmAnswer) } },
      ],
    }).compileComponents();
  });

  // ------------------------------------------------------------- on / off

  it('asks before turning one off, then sends DISABLED', () => {
    build().toggleEnabled(integration());

    expect(setStatus).toHaveBeenCalledWith(7, IntegrationStatus.DISABLED);
  });

  it('does nothing if the confirmation is declined', () => {
    confirmAnswer = false;

    build().toggleEnabled(integration());

    expect(setStatus).not.toHaveBeenCalled();
  });

  it('turns a disabled one back on without asking', () => {
    build().toggleEnabled(integration({ status: IntegrationStatus.DISABLED }));

    expect(setStatus).toHaveBeenCalledWith(7, IntegrationStatus.ACTIVE);
  });

  // --------------------------------------------------------- dropped keys

  it('reads the comma-separated keys the backend records', () => {
    const component = build();
    const row = integration({
      lastIgnoredKeys: 'utm_source, customer.email',
      lastUnmatchedFields: 'mobile',
    });

    expect(component.ignoredKeys(row)).toEqual(['utm_source', 'customer.email']);
    expect(component.unmatchedFields(row)).toEqual(['mobile']);
    expect(component.hasDiagnostics(row)).toBeTrue();
  });

  it('stays quiet when the last payload lined up', () => {
    const component = build();

    expect(component.hasDiagnostics(integration())).toBeFalse();
    expect(component.hasDiagnostics(integration({ lastIgnoredKeys: '' }))).toBeFalse();
  });

  it('warns about a rename on the sending side even though nothing was ignored', () => {
    const component = build();
    const row = integration({ lastUnmatchedFields: 'mobile' });

    expect(component.hasDiagnostics(row)).toBeTrue();
  });

  // ------------------------------------------------- mapping from a payload

  it('drops a suggested key into the first empty mapping row', () => {
    const component = build();
    component.mappingRows.set([
      { uid: 1, sourceField: 'mobile', formFieldId: 1 },
      { uid: 2, sourceField: '', formFieldId: 2 },
    ]);

    component.useSuggestion('customer.email');

    expect(component.mappingRows().map((r) => r.sourceField)).toEqual([
      'mobile',
      'customer.email',
    ]);
  });

  it('adds a row when every row is already filled', () => {
    const component = build();
    component.mappingRows.set([{ uid: 1, sourceField: 'mobile', formFieldId: 1 }]);

    component.useSuggestion('customer.email');

    expect(component.mappingRows().length).toBe(2);
    expect(component.mappingRows()[1].sourceField).toBe('customer.email');
  });

  it('offers the ignored keys of the integration being mapped', () => {
    const component = build();
    component.mappingFor.set(integration({ lastIgnoredKeys: 'utm_source,city' }));

    expect(component.mappingSuggestions()).toEqual(['utm_source', 'city']);
  });
});
