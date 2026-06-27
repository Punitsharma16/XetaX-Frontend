import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Order, OrderStatus, CurrentBill, BillItem } from '../models/order.models';
import { CartService } from './cart.service';

@Injectable({ providedIn: 'root' })
export class OrderService {

  private orders = new BehaviorSubject<Order[]>([]);
  orders$ = this.orders.asObservable();

  private currentOrder = new BehaviorSubject<Order | null>(null);
  currentOrder$ = this.currentOrder.asObservable();

  constructor(private cartService: CartService) {}

  placeOrder(customerName: string, customerMobile: string, resourceType: 'table' | 'room', resourceId: string, paymentMethod: 'ONLINE' | 'UPI_QR', notes = '', scheduledTime: string | null = null): Observable<Order> {
    // TODO: Replace with API call
    // this.baseService.postDataFromAPI(UrlConstants.PLACE_ORDER, body)
    const cartItems = this.cartService.getCartSnapshot();
    const order: Order = {
      id: 'ORD' + Date.now(),
      resourceType,
      resourceId,
      customerName,
      customerMobile,
      items: cartItems.map(i => ({
        menuItemId: i.menuItem.id,
        name: i.menuItem.name,
        quantity: i.quantity,
        price: i.menuItem.price,
        specialInstructions: i.specialInstructions,
      })),
      subtotal: this.cartService.subtotal,
      tax: this.cartService.tax,
      grandTotal: this.cartService.grandTotal,
      status: 'PENDING',
      paymentMethod,
      paymentStatus: 'PENDING',
      estimatedTime: 25,
      notes,
      scheduledTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const current = this.orders.value;
    current.unshift(order);
    this.orders.next(current);
    this.currentOrder.next(order);
    this.cartService.clearCart();
    return of(order).pipe(delay(500));
  }

  getOrderById(orderId: string): Observable<Order | undefined> {
    // TODO: Replace with API call
    const order = this.orders.value.find(o => o.id === orderId);
    return of(order).pipe(delay(200));
  }

  trackOrder(orderId: string): Observable<Order | undefined> {
    return this.getOrderById(orderId);
  }

  getCurrentBill(resourceType: 'table' | 'room', resourceId: string): Observable<CurrentBill> {
    // TODO: Replace with API call
    const order = this.orders.value.find(o => o.resourceId === resourceId && o.resourceType === resourceType);
    const bill: CurrentBill = {
      resourceType,
      resourceId,
      customerName: order?.customerName || 'Guest',
      items: order?.items.map(i => ({ description: i.name, quantity: i.quantity, amount: i.price * i.quantity })) || [],
      foodCharges: order?.subtotal || 0,
      tax: order?.tax || 0,
      serviceCharges: Math.round((order?.subtotal || 0) * 0.08),
      grandTotal: (order?.grandTotal || 0) + Math.round((order?.subtotal || 0) * 0.08),
      outstandingAmount: (order?.grandTotal || 0) + Math.round((order?.subtotal || 0) * 0.08),
      billNumber: 'BILL' + Date.now(),
      generatedAt: new Date().toISOString(),
    };
    return of(bill).pipe(delay(300));
  }

  updateOrderStatus(orderId: string, status: OrderStatus): void {
    const current = this.orders.value;
    const order = current.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date().toISOString();
      this.orders.next([...current]);
      if (this.currentOrder.value?.id === orderId) {
        this.currentOrder.next(order);
      }
    }
  }

  getOrderTimeline(): Observable<{ label: string; status: OrderStatus; completed: boolean }[]> {
    const timeline = [
      { label: 'Order Placed', status: 'PENDING' as OrderStatus, completed: false },
      { label: 'Preparing', status: 'PREPARING' as OrderStatus, completed: false },
      { label: 'Ready', status: 'READY' as OrderStatus, completed: false },
      { label: 'Served', status: 'SERVED' as OrderStatus, completed: false },
      { label: 'Completed', status: 'COMPLETED' as OrderStatus, completed: false },
    ];
    return of(timeline).pipe(delay(200));
  }
}
