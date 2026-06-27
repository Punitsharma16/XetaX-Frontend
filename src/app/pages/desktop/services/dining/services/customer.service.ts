import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CustomerSession } from '../models/customer.models';

@Injectable({ providedIn: 'root' })
export class CustomerService {

  private session = new BehaviorSubject<CustomerSession | null>(null);
  session$ = this.session.asObservable();

  setSession(session: CustomerSession): void {
    this.session.next(session);
    localStorage.setItem('qr_ordering_session', JSON.stringify(session));
  }

  getSession(): CustomerSession | null {
    const cached = localStorage.getItem('qr_ordering_session');
    if (cached) {
      try {
        const session = JSON.parse(cached) as CustomerSession;
        this.session.next(session);
        return session;
      } catch { /* ignore */ }
    }
    return this.session.value;
  }

  clearSession(): void {
    this.session.next(null);
    localStorage.removeItem('qr_ordering_session');
  }

  saveCustomerInfo(name: string, mobile: string): void {
    const current = this.session.value;
    if (current) {
      this.setSession({ ...current, customerName: name, customerMobile: mobile });
    }
  }

  getCustomerByMobile(mobile: string): Observable<any> {
    // TODO: Replace with API call
    // this.baseService.getDataFromAPI(UrlConstants.GET_CUSTOMER + `?mobile=${mobile}`)
    return of({
      id: 'CUST' + Date.now(),
      name: '',
      mobile,
      email: '',
      totalOrders: 0,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
    }).pipe(delay(200));
  }

  getOrderHistory(customerId: string): Observable<any> {
    // TODO: Replace with API call
    return of({
      orders: [],
      totalSpent: 0,
      favoriteItems: [],
    }).pipe(delay(300));
  }

  getLoyaltyProgram(customerId: string): Observable<any> {
    // TODO: Replace with API call
    return of({
      points: 0,
      tier: 'Bronze',
      pointsToNextTier: 500,
      benefits: ['Exclusive offers', 'Birthday special'],
    }).pipe(delay(200));
  }
}
