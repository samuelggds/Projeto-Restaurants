import api from './api';
import { getGuestOrderTrackingToken } from './ordersService';

export type DeliveryChatMessage = {
  id: string;
  senderRole: 'CUSTOMER' | 'COURIER' | string;
  senderName: string;
  message: string;
  createdAt: string;
};

export type DeliveryChatSnapshot = {
  order: {
    id: number;
    publicId: string;
    status: string;
    restaurantId: number;
    restaurantName: string;
    customerName: string;
    customerPhone?: string | null;
    courierId?: number | null;
    courierName: string;
  };
  thread: {
    id: number;
    status: string;
    readOnly: boolean;
    createdAt: string;
    updatedAt: string;
    closedAt?: string | null;
  };
  messages: DeliveryChatMessage[];
};

function guestHeaders(orderId: number) {
  const guestToken = getGuestOrderTrackingToken(orderId);
  return guestToken ? { 'x-guest-order-token': guestToken } : undefined;
}

class DeliveryChatService {
  async get(orderId: number): Promise<DeliveryChatSnapshot> {
    const response = await api.get(`/delivery-chat/${orderId}`, {
      headers: guestHeaders(orderId),
    });
    return response.data;
  }

  async send(orderId: number, message: string) {
    const response = await api.post(
      `/delivery-chat/${orderId}/messages`,
      { message },
      { headers: guestHeaders(orderId) },
    );
    return response.data;
  }
}

export default new DeliveryChatService();
