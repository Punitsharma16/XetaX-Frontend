import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { WhatsAppSettingsComponent } from './whatsapp-settings.component';

/**
 * Outside the 24-hour window a Flow can only reach a customer behind a button
 * on an approved template. The panel said exactly that when it refused a bare
 * Flow send, while its own template builder offered no way to make one.
 */
describe('WhatsAppSettingsComponent — Flow buttons', () => {
  let fixture: ComponentFixture<WhatsAppSettingsComponent>;
  let component: WhatsAppSettingsComponent;
  let http: HttpTestingController;

  const flows = [
    { id: 1, name: 'flow_xeta', status: 'PUBLISHED', metaFlowId: '4398428720470405' },
    { id: 2, name: 'draft_flow', status: 'DRAFT', metaFlowId: null },
  ];

  const answer = (published: unknown[]) => {
    for (const request of http.match(() => true)) {
      request.flush({ data: request.request.url.endsWith('/flows') ? published : [] });
    }
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsAppSettingsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(WhatsAppSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('offers only the Flows that are actually published', () => {
    answer(flows);

    expect(component.publishedFlows().map((f) => f.name)).toEqual(['flow_xeta']);
  });

  it('adds a Flow button already pointing at a Flow', () => {
    answer(flows);

    component.addButton('FLOW');

    expect(component.tplButtons.length).toBe(1);
    expect(component.tplButtons[0].flowId).toBe('4398428720470405');
    expect(component.tplButtons[0].flowAction).toBe('navigate');
  });

  it('keeps a template to a single Flow button', () => {
    answer(flows);
    component.addButton('FLOW');

    component.addButton('FLOW');

    expect(component.tplButtons.length).toBe(1);
  });

  it('adds nothing when no Flow has been published yet', () => {
    answer([{ id: 2, name: 'draft_flow', status: 'DRAFT', metaFlowId: null }]);

    component.addButton('FLOW');

    expect(component.tplButtons.length).toBe(0);
  });

  it('still allows the ordinary buttons', () => {
    answer(flows);

    component.addButton('QUICK_REPLY');
    component.addButton('URL');

    expect(component.tplButtons.map((b) => b.type)).toEqual(['QUICK_REPLY', 'URL']);
  });
});
