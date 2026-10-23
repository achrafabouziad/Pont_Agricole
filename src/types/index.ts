export type UserRole = 'admin' | 'customer';

export type BusinessType = 'restaurant' | 'cafe' | 'hotel' | 'caterer' | 'other';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'delivering'
  | 'delivered'
  | 'cancelled';

export type ProductUnit = 'kg' | 'caisse' | 'carton' | 'botte' | 'piece';

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface Business {
  id: string;
  ownerId: string;
  businessName: string;
  businessType: BusinessType;
  city: string;
  deliveryAddress: string;
  approvalStatus: ApprovalStatus;
  createdAt: string;
  contactName?: string;
  phone?: string;
  email?: string;
  googleMapsUrl?: string;
  username?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  unit: ProductUnit;
  price: number; // in MAD (DH)
  minimumQuantity: number;
  isAvailable: boolean;
  origin?: string; // e.g. "Souss-Massa", "Saïss", "Gharb"
  badge?: string; // e.g. "Bio", "Saison", "Populaire"
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  productNameSnapshot: string;
  unitSnapshot: ProductUnit;
  unitPriceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  businessId?: string;
  businessName?: string;
  businessType?: BusinessType;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryCity: string;
  requestedDeliveryDate: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  customerNotes?: string;
  rejectionReason?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryZone {
  id: string;
  city: string;
  zoneName: string;
  deliveryFee: number;
  minimumOrderAmount: number;
  isActive: boolean;
  estimatedHours: string;
}

export interface CompanySettings {
  companyName: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  minOrderDefault: number;
  freeDeliveryThreshold: number;
  deliveryDays: string[];
  orderCutoffTime: string;
}
