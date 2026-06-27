export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  totalOrders: number;
  loyaltyPoints: number;
  createdAt: string;
}

export interface CustomerSession {
  customerId: string;
  customerName: string;
  customerMobile: string;
  resourceType: 'table' | 'room';
  resourceId: string;
  resourceName: string;
}

export interface OrderHistory {
  orders: OrderSummary[];
  totalSpent: number;
  favoriteItems: string[];
}

export interface OrderSummary {
  id: string;
  date: string;
  items: number;
  total: number;
  status: string;
}

export interface LoyaltyProgram {
  points: number;
  tier: string;
  pointsToNextTier: number;
  benefits: string[];
}
