import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router, provideRouter } from '@angular/router';

import { DeskWidgetComponent } from './desk-widget.component';

/**
 * The desk opens itself when someone follows a ?desk=open link. The query
 * string stays in the address bar afterwards, so the deep link must fire once
 * and then leave the panel alone — otherwise the close button does nothing.
 */
describe('DeskWidgetComponent', () => {
  let fixture: ComponentFixture<DeskWidgetComponent>;
  let component: DeskWidgetComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeskWidgetComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue('/app/dashboard?desk=open');

    fixture = TestBed.createComponent(DeskWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    for (const request of TestBed.inject(HttpTestingController).match(() => true)) {
      request.flush({ data: [] });
    }
  });

  it('opens once the desk is available', () => {
    component.enabled.set(true);
    fixture.detectChanges();

    expect(component.open()).toBeTrue();
  });

  it('stays closed after the user closes it, though the link is still in the URL', () => {
    component.enabled.set(true);
    fixture.detectChanges();

    component.toggle();
    fixture.detectChanges();

    expect(component.open()).toBeFalse();
  });

  it('reads a zone-less timestamp from the API as UTC', () => {
    const justNow = new Date(Date.now() - 60_000).toISOString().replace('Z', '');

    expect(component.waitingFor(justNow)).toBe('1 min');
  });

  it('still understands a timestamp that carries its zone', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000).toISOString();

    expect(component.waitingFor(fiveMinutesAgo)).toBe('5 min');
  });

  it('does not re-open when the availability check runs again', () => {
    component.enabled.set(true);
    fixture.detectChanges();
    component.toggle();
    fixture.detectChanges();

    component.enabled.set(false);
    fixture.detectChanges();
    component.enabled.set(true);
    fixture.detectChanges();

    expect(component.open()).toBeFalse();
  });
});
