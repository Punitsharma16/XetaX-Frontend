import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { InvoiceDetailComponent } from './invoice-detail.component';

/**
 * The editor must keep what the user has typed. Losing the customer halfway
 * through an invoice is silent: the page still looks fine, the name is simply
 * gone by the time they press save.
 */
describe('InvoiceDetailComponent (create mode)', () => {
  let fixture: ComponentFixture<InvoiceDetailComponent>;
  let component: InvoiceDetailComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceDetailComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InvoiceDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('id', 'new');
    fixture.detectChanges();

    for (const request of TestBed.inject(HttpTestingController).match(() => true)) {
      request.flush({ data: { content: [] } });
    }
    fixture.detectChanges();
  });

  it('keeps the typed customer when another line is added', () => {
    component.customerName = 'TEST Wipe Check';
    component.customerPhone = '9896458807';

    component.addItem();
    fixture.detectChanges();

    expect(component.items().length).toBe(2);
    expect(component.customerName).toBe('TEST Wipe Check');
    expect(component.customerPhone).toBe('9896458807');
  });

  it('keeps the typed customer when a line is removed', () => {
    component.addItem();
    fixture.detectChanges();
    component.customerName = 'TEST Wipe Check';

    component.removeItem(component.items()[0].uid);
    fixture.detectChanges();

    expect(component.customerName).toBe('TEST Wipe Check');
  });

  it('starts with one empty line', () => {
    expect(component.items().length).toBe(1);
  });

  it('totals what the user typed into the line, not what the line started as', () => {
    const row = component.items()[0];
    row.description = 'TEST QA service';
    row.quantity = 2;
    row.unitPrice = 1500;
    component.taxPercent = 18;

    expect(component.subtotal()).toBe(3000);
    expect(component.taxAmount()).toBe(540);
    expect(component.rawTotal()).toBe(3540);
  });

  it('follows a second line as it is typed', () => {
    component.items()[0].quantity = 1;
    component.items()[0].unitPrice = 1000;
    component.addItem();
    const second = component.items()[1];
    second.quantity = 3;
    second.unitPrice = 500;

    expect(component.subtotal()).toBe(2500);
  });
});
