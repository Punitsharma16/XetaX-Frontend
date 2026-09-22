import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { DashboardComponent } from './dashboard.component';
import { PermissionService } from '../../core/services/permission.service';

/**
 * A member without the invoices permission must not have the dashboard ask
 * for the invoice summary on their behalf: the answer is 403, it lands in the
 * console and in the server's logs, and the tile is hidden from them anyway.
 */
describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let http: HttpTestingController;

  const answer = (permissions: string[]) => {
    for (const request of http.match(() => true)) {
      const url = request.request.url;
      if (url.includes('/team/me')) {
        request.flush({ data: { isOwner: false, permissions, name: 'TEST Sneha' } });
      } else {
        request.flush({ data: null });
      }
    }
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    // The shell loads the permission context in the running app.
    TestBed.inject(PermissionService).load();
  });

  const invoiceCalls = () => http.match((r) => r.url.includes('/api/invoices/summary')).length;

  it('never asks for the invoice summary without the permission', () => {
    expect(invoiceCalls()).toBe(0);

    answer(['records.view']);

    expect(invoiceCalls()).toBe(0);
  });

  it('asks for it once the permission is known', () => {
    answer(['records.view', 'invoices.view']);

    expect(invoiceCalls()).toBe(1);
  });
});
