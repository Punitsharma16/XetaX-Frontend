import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';

import { ShellComponent } from './shell.component';

/**
 * The sidebar expands the Records submenu when a records page opens. It must
 * still be possible to fold it away: the submenu is long on a workspace with
 * many forms, and a fold that springs back reads as a broken sidebar.
 */
describe('ShellComponent sidebar', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let component: ShellComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue('/app/records');

    fixture = TestBed.createComponent(ShellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    for (const request of TestBed.inject(HttpTestingController).match(() => true)) {
      const url = request.request.url;
      if (url.includes('/team/me')) request.flush({ data: { isOwner: true, permissions: [], company: 'TEST Co' } });
      else request.flush({ data: [] });
    }
    fixture.detectChanges();
  });

  it('expands the submenu on a records page', () => {
    expect(component.recordsOpen()).toBeTrue();
  });

  it('lets the submenu be folded away while still on a records page', () => {
    component.toggleRecords();
    fixture.detectChanges();

    expect(component.recordsOpen()).toBeFalse();
  });
});
