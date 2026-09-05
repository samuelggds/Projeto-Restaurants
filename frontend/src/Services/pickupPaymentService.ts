import api from './api';

export type PickupPayment = {
  orderId: number;
  method: 'PIX' | 'CARTAO' | string;
  provider: string;
  status: string;
  amount: number;
  pixCopyPaste?: string | null;
  pixQrCodeBase64?: string | null;
  providerOrderId?: string | null;
  lastProviderStatus?: string | null;
  paidAt?: string | null;
};

class PickupPaymentService {
  async start(orderId: number, method: 'PIX' | 'CARTAO', terminalPublicId?: string) {
    const response = await api.post(`/pickup-payments/${orderId}/start`, {
      method,
      ...(terminalPublicId ? { terminalPublicId } : {}),
    });
    return response.data as { payment: PickupPayment | null; order: unknown };
  }

  async reconcile(orderId: number) {
    const response = await api.post(`/pickup-payments/${orderId}/reconcile`);
    return response.data as { paid: boolean; payment: PickupPayment | null; order: unknown };
  }

  async confirmCash(orderId: number) {
    const response = await api.post(`/pickup-payments/${orderId}/cash`);
    return response.data;
  }
}

export default new PickupPaymentService();
