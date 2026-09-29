import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { IntegrationService } from './integration.service';
import { IntegrationStatus } from '../../core/models/crm.model';
import { environment } from '../../../environments/environment';

/**
 * The webhook URL is copied out of the panel and pasted into somebody else's
 * system, often inside a ready-made curl command. The backend answers with a
 * path, and a path alone posts to whatever host happens to run that command.
 */
describe('IntegrationService webhook URL', () => {
  let service: IntegrationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IntegrationService);
  });

  it('turns the backend path into a URL someone else can post to', () => {
    const url = service.webhookUrl({ endpoint: '/api/public/integrations/abc', integrationKey: 'abc' } as never);

    expect(url).toBe(`${environment.crmBaseUrl}/api/public/integrations/abc`);
  });

  it('leaves an absolute endpoint alone', () => {
    const url = service.webhookUrl({ endpoint: 'https://hooks.example.com/x', integrationKey: 'abc' } as never);

    expect(url).toBe('https://hooks.example.com/x');
  });

  it('falls back to the key when no endpoint comes back', () => {
    const url = service.webhookUrl({ integrationKey: 'abc' } as never);

    expect(url).toBe(`${environment.crmBaseUrl}/api/public/integrations/abc`);
  });
});

/**
 * IntegrationStatus has carried DISABLED from the start, but nothing ever set
 * it — stopping an integration meant deleting it, losing the URL, the API key
 * and every mapping with it. A wrong verb or path here fails as a 404 or 405
 * at runtime and nowhere else, so it is pinned.
 */
describe('IntegrationService status switch', () => {
  let service: IntegrationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IntegrationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('PATCHes the status endpoint when turning one off', () => {
    service.setStatus(7, IntegrationStatus.DISABLED).subscribe();

    const req = http.expectOne(`${environment.crmBaseUrl}/api/integrations/7/status`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'DISABLED' });
    req.flush({ data: {} });
  });

  it('sends ACTIVE when turning one back on', () => {
    service.setStatus(7, IntegrationStatus.ACTIVE).subscribe();

    const req = http.expectOne(`${environment.crmBaseUrl}/api/integrations/7/status`);
    expect(req.request.body).toEqual({ status: 'ACTIVE' });
    req.flush({ data: {} });
  });
});
