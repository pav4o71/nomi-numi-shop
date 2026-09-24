type OrderRow = {
  id: string;
  customerId: string | null;
  email: string;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  subtotalAmount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function toPublicOrder(order: OrderRow) {
  return {
    id: order.id,
    email: order.email,
    currency: order.currency,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    subtotalAmount: order.subtotalAmount,
    shippingAmount: order.shippingAmount,
    taxAmount: order.taxAmount,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function orderAccessCookieName(orderId: string): string {
  return `nomi_order_access_${orderId}`;
}

export function parseOrderAccess(value: string | undefined) {
  return value || undefined;
}
