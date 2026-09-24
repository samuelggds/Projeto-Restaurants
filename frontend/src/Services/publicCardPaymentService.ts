import api from './api';

export type PublicCardPaymentConfig = {
  provider: 'MERCADO_PAGO' | 'PAGARME' | 'PAGBANK' | 'ASAAS';
  publicKey?: string;
};

class PublicCardPaymentService {
  async getConfig(restaurantId: number) {
    const response = await api.get(`/settings/public/${restaurantId}/card-payment-config`);
    return response.data as PublicCardPaymentConfig;
  }
}

export default new PublicCardPaymentService();