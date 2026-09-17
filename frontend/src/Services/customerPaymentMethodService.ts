import api from './api';

export type CustomerPaymentMethod = {
  publicId: string;
  provider: string;
  providerCardId?: string;
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
    response?: { data?: { error?: unknown; message?: unknown; code?: unknown } };
    message?: unknown;
  };
  const code = String(typed?.response?.data?.code || '').trim();
  if (code === 'MP_CONNECTION_RENEWAL_REQUIRED') {
    return 'O pagamento com cartão está temporariamente indisponível porque a conexão do restaurante com o Mercado Pago precisa ser renovada.';
  }
  if (code === 'MP_CARD_INVALID') {
    return 'O Mercado Pago não conseguiu validar este cartão. Confira número, validade e CVV e tente novamente.';
  }
  if (code === 'MP_CUSTOMER_UNAVAILABLE') {
    return 'Não foi possível preparar seu cartão no Mercado Pago agora. Tente novamente em alguns instantes.';
  }

  const message = typed?.response?.data?.error || typed?.response?.data?.message || typed?.message;
  const normalized = typeof message === 'string' ? message.trim() : '';
  if (!normalized || /^request failed with status code/i.test(normalized)) return fallback;

  const rejectedCardToken =
    /invalid.*card.*token|card.*token.*invalid|token.*(?:cart(?:ã|a)o|card).*(?:invalid|inválid|recusad)/i.test(
      normalized,
    );
  if (rejectedCardToken) {
    return 'O Mercado Pago não conseguiu validar este cartão. Confira os dados e tente cadastrá-lo novamente.';
  }

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
    // No perfil o cliente está autenticado, então usamos a configuração protegida.
    // Ela valida a credencial privada do mesmo restaurante antes de entregar a Public Key,
    // impedindo tokenização com uma conta que o backend não consegue mais operar.
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