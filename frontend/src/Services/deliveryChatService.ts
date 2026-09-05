import api from './api';
import { getGuestOrderTrackingToken } from './ordersService';

export type DeliveryChatMessage = {
  id: string;
  senderRole: 'CUSTOMER' | 'COURIER' | string;
  senderName: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
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

export type CourierChatConversation = {
  threadId: number;
  orderId: number;
  status: string;
  customerName: string;
  customerPhone?: string | null;
  updatedAt: string;
  lastMessage: string;
  lastSenderRole: string;
  lastMessageAt: string;
  unreadCount: number;
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

  async courierInbox(): Promise<CourierChatConversation[]> {
    const response = await api.get('/delivery-chat/courier/inbox');
    return Array.isArray(response.data?.conversations) ? response.data.conversations : [];
  }

  async markRead(orderId: number) {
    const response = await api.post(
      `/delivery-chat/${orderId}/read`,
      {},
      { headers: guestHeaders(orderId) },
    );
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
