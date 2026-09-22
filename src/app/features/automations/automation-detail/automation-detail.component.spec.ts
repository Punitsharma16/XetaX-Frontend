import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { AutomationDetailComponent } from './automation-detail.component';

/**
 * A vertical pack installs its automations paused and tells the owner to read
 * the messages and switch them on. The panel showed the state and offered no
 * switch, so those rules could never run.
 */
describe('AutomationDetailComponent', () => {
  let fixture: ComponentFixture<AutomationDetailComponent>;
  let component: AutomationDetailComponent;
  let http: HttpTestingController;

  const rule = {
    id: 15,
    name: 'TEST welcome',
    formId: 3,
    trigger: 'RECORD_CREATED',
    active: false,
    actionType: 'CREATE_TASK',
    actionValue: 'Call {full_name}',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutomationDetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AutomationDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', '15');
    fixture.detectChanges();

    for (const request of http.match(() => true)) {
      request.flush({ data: request.request.url.endsWith('/15') ? rule : [] });
    }
    fixture.detectChanges();
  });

  it('switches a paused rule on', () => {
    component.toggleActive();

    const call = http.expectOne((r) => r.method === 'PUT' && r.url.includes('/api/automations/15'));
    expect(call.request.body.active).toBeTrue();
    expect(call.request.body.actionValue).toBe('Call {full_name}');

    call.flush({ data: { ...rule, active: true } });
    expect(component.automation()?.active).toBeTrue();
  });

  it('pauses a running rule', () => {
    component.automation.set({ ...rule, active: true } as never);

    component.toggleActive();

    const call = http.expectOne((r) => r.method === 'PUT' && r.url.includes('/api/automations/15'));
    expect(call.request.body.active).toBeFalse();
  });

  it('does not fire twice while the first change is in flight', () => {
    component.toggleActive();
    http.expectOne((r) => r.method === 'PUT');

    component.toggleActive();

    http.expectNone((r) => r.method === 'PUT' && r.url.includes('/api/automations/15'));
  });
});
