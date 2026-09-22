import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { IntegrationService } from './integration.service';
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
