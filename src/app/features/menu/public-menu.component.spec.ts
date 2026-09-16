import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';
import { PublicMenuComponent } from './public-menu.component';

/**
 * The customer's basket. The server prices every order from the menu, so the
 * page must only ever send item ids and quantities — and the preview total it
 * shows must match what the server will charge, offers included.
 */
describe('PublicMenuComponent', () => {

  let fixture: ComponentFixture<PublicMenuComponent>;
  let component: PublicMenuComponent;
  let http: HttpTestingController;

  const menu = {
    title: 'Spice Hut',
    tagline: 'Fresh food',
    currency: 'INR',
    orderTypes: ['DINE_IN', 'TAKEAWAY'],
    categories: [
      {
        id: 1, name: 'Starters', description: null,
        items: [
          { id: 11, name: 'Paneer Tikka', description: null, price: 240, offerPrice: null, offerLabel: null, veg: true, available: true, imageUrl: null },
          { id: 12, name: 'Sweet Lassi', description: null, price: 80, offerPrice: 60, offerLabel: '25% OFF', veg: true, available: true, imageUrl: null },
          { id: 13, name: 'Chicken 65', description: null, price: 260, offerPrice: null, offerLabel: null, veg: false, available: true, imageUrl: null },
          { id: 14, name: 'Tomato Soup', description: null, price: 120, offerPrice: null, offerLabel: null, veg: true, available: false, imageUrl: null },
        ],
      },
    ],
  };

  const url = (path = '') => `${environment.crmBaseUrl}/api/public/menu/KEY${path}`;

  const create = (table?: string) => {
    localStorage.removeItem('xetax-menu-basket:KEY');
    fixture = TestBed.createComponent(PublicMenuComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('key', 'KEY');
    if (table) fixture.componentRef.setInput('table', table);
    fixture.detectChanges();
    http.expectOne(url()).flush({ data: menu });
    fixture.detectChanges();
  };

  const item = (id: number) => menu.categories[0].items.find((i) => i.id === id)!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicMenuComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('xetax-menu-basket:KEY');
  });

  describe('the basket', () => {

    beforeEach(() => create());

    it('adds and removes dishes', () => {
      component.add(item(11));
      component.add(item(11));
      component.add(item(12));
      expect(component.count()).toBe(3);
      component.remove(item(11));
      expect(component.quantity(item(11))).toBe(1);
      component.remove(item(11));
      expect(component.quantity(item(11))).toBe(0);
      expect(component.lines().map((l) => l.item.id)).toEqual([12]);
    });

    it('prices an offer at its offer price', () => {
      component.add(item(11));
      component.add(item(11));
      component.add(item(12));
      // 2 × 240 + 1 × 60 — the same sum the server makes.
      expect(component.total()).toBe(540);
    });

    it('will not add a sold-out dish', () => {
      component.add(item(14));
      expect(component.count()).toBe(0);
    });

    it('caps one dish at fifty, as the server does', () => {
      for (let i = 0; i < 60; i++) component.add(item(11));
      expect(component.quantity(item(11))).toBe(50);
    });

    it('filters to veg dishes only', () => {
      component.vegOnly.set(true);
      const names = component.sections()[0].items.map((i) => i.name);
      expect(names).not.toContain('Chicken 65');
      expect(names).toContain('Paneer Tikka');
    });
  });

  describe('placing the order', () => {

    it('sends only ids and quantities — never a price', () => {
      create();
      component.add(item(11));
      component.add(item(12));
      component.name = 'Asha';
      component.phone = '+91 98765 43210';
      component.orderType = 'TAKEAWAY';
      component.placeOrder();

      const request = http.expectOne(url('/orders'));
      expect(request.request.method).toBe('POST');
      expect(request.request.body.items).toEqual([
        { itemId: 11, quantity: 1 },
        { itemId: 12, quantity: 1 },
      ]);
      expect(JSON.stringify(request.request.body)).not.toContain('price');
      expect(request.request.body.orderType).toBe('TAKEAWAY');
      expect(request.request.body.table).toBe('');

      request.flush({ data: { ok: true, reference: 'BC12EF', total: 300, message: 'Order placed!' } });
      expect(component.placed()?.reference).toBe('BC12EF');
      expect(component.count()).toBe(0, 'the basket empties once the order is in');
    });

    it('asks for a name and a proper mobile number before sending', () => {
      create();
      component.add(item(11));
      component.placeOrder();
      expect(component.error()).toContain('name');

      component.name = 'Asha';
      component.phone = '12345';
      component.placeOrder();
      expect(component.error()).toContain('10-digit');
      http.expectNone(url('/orders'));
    });

    it('drops an old error once the customer starts typing', () => {
      create();
      component.add(item(11));
      component.openCheckout();
      fixture.detectChanges();
      component.placeOrder();
      fixture.detectChanges();
      expect(component.error()).toContain('name');

      const input = (fixture.nativeElement as HTMLElement).querySelector('.pm-field input') as HTMLInputElement;
      input.value = 'A';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(component.error()).toBe('');
    });

    it('asks for an address on delivery', () => {
      create();
      component.add(item(11));
      component.name = 'Asha';
      component.phone = '9876543210';
      component.orderType = 'DELIVERY';
      component.placeOrder();
      expect(component.error()).toContain('address');
      http.expectNone(url('/orders'));
    });

    it('shows the server’s reason when an order is refused', () => {
      create();
      component.add(item(11));
      component.name = 'Asha';
      component.phone = '9876543210';
      component.placeOrder();
      http.expectOne(url('/orders')).flush(
        { message: "'Paneer Tikka' is sold out — please remove it" },
        { status: 400, statusText: 'Bad Request' });
      expect(component.error()).toContain('sold out');
      expect(component.count()).toBe(1, 'a refused order keeps the basket');
    });
  });

  describe('a table QR code', () => {

    it('opens as a dine-in order with the table filled in', () => {
      create('7');
      expect(component.orderType).toBe('DINE_IN');
      expect(component.tableNo).toBe('7');

      component.add(item(11));
      component.name = 'Asha';
      component.phone = '9876543210';
      component.placeOrder();
      const request = http.expectOne(url('/orders'));
      expect(request.request.body.table).toBe('7');
      request.flush({ data: { ok: true, reference: 'X', total: 240, message: 'ok' } });
    });

    it('defaults to takeaway without one', () => {
      create();
      expect(component.orderType).toBe('TAKEAWAY');
    });
  });

  describe('a basket saved before a refresh', () => {

    it('comes back, minus anything now sold out or gone', () => {
      localStorage.setItem('xetax-menu-basket:KEY', JSON.stringify({ 11: 2, 14: 1, 999: 3 }));
      fixture = TestBed.createComponent(PublicMenuComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('key', 'KEY');
      fixture.detectChanges();
      http.expectOne(url()).flush({ data: menu });
      fixture.detectChanges();

      expect(component.basket()).toEqual({ 11: 2 });
    });
  });

  it('says so when the menu does not exist', () => {
    fixture = TestBed.createComponent(PublicMenuComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('key', 'KEY');
    fixture.detectChanges();
    http.expectOne(url()).flush({ message: 'Menu not found' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(component.notFound()).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain("isn't available");
  });
});
