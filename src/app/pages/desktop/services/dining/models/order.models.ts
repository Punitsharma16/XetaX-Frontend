export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';

export type PaymentMethod = 'ONLINE' | 'UPI_QR';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface OrderItem {
  menuItemId: number;
  name: string;
  quantity: number;
  price: number;
  specialInstructions: string;
}

export interface Order {
  id: string;
  resourceType: 'table' | 'room';
  resourceId: string;
  customerName: string;
  customerMobile: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  estimatedTime: number;
  notes: string;
  scheduledTime: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillItem {
  description: string;
  quantity: number;
  amount: number;
}

export interface CurrentBill {
  resourceType: 'table' | 'room';
  resourceId: string;
  customerName: string;
  items: BillItem[];
  foodCharges: number;
  tax: number;
  serviceCharges: number;
  grandTotal: number;
  outstandingAmount: number;
  billNumber: string;
  generatedAt: string;
}
