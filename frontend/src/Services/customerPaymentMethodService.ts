import api from './api';

export type CustomerPaymentMethod = {
  publicId: string;
  provider: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName?: string | null;
  isDefault: boolean;
};

export function selectSavedPaymentMethod(
  methods: CustomerPaymentMethod[],
  selectedId?: string | null,
) {
  return (
    methods.find((method) => method.publicId === selectedId) ||
    methods.find((method) => method.isDefault) ||
    methods[0] ||
    null
  );
}

export function getPaymentMethodErrorMessage(error: unknown, fallback: string) {
  const typed = error as {
    response?: { data?: { error?: unknown; message?: unknown } };
    message?: unknown;
  };
  const message = typed?.response?.data?.error || typed?.response?.data?.message || typed?.message;
  const normalized = typeof message === 'string' ? message.trim() : '';
  if (!normalized || /^request failed with status code/i.test(normalized)) return fallback;

  const restaurantConfigIssue =
    /(?:configur(?:a|ado|ação|ações)|configura(?:ç|c)ões).*(?:restaurante|loja|estabelecimento|gateway|provedor|pagbank|mercado pago|asaas)/i.test(
      normalized,
    ) ||
    /(?:ainda não foi configurad|configure|configur).*?(?:gateway|pagbank|mercado pago|asaas|restaurante|loja|estabelecimento)/i.test(
      normalized,
    );
  const exposesTechnicalDetails =
    /(?:access token|token(?:\s|$)|credencial|chave pública|chave do|gateway|integrac(?:ã|a)o)/i.test(
      normalized,
    ) && !/cart(?:ã|a)o|cvv|dados do cart(?:ã|a)o|dados do pagamento/i.test(normalized);

  if (restaurantConfigIssue || exposesTechnicalDetails) {
    return fallback;
  }

  return normalized.slice(0, 240);
}

class CustomerPaymentMethodService {
  async list(restaurantId: number) {
    const response = await api.get('/customer-payment-methods', { params: { restaurantId } });
    return (response.data?.paymentMethods || []) as CustomerPaymentMethod[];
  }
  async getConfig(restaurantId: number) {
    const response = await api.get('/customer-payment-methods/config', {
      params: { restaurantId },
    });
    return response.data as { provider: 'PAGBANK' | 'MERCADO_PAGO' | 'ASAAS'; publicKey?: string };
  }
  async create(payload: Record<string, unknown>) {
    const response = await api.post('/customer-payment-methods', payload);
    return response.data.paymentMethod as CustomerPaymentMethod;
  }
  async makeDefault(publicId: string, restaurantId: number) {
    const response = await api.put(
      `/customer-payment-methods/${encodeURIComponent(publicId)}/default`,
      undefined,
      { params: { restaurantId } },
    );
    return response.data.paymentMethod as CustomerPaymentMethod;
  }
  async remove(publicId: string, restaurantId: number) {
    await api.delete(`/customer-payment-methods/${encodeURIComponent(publicId)}`, {
      params: { restaurantId },
    });
  }
}

export default new CustomerPaymentMethodService();
