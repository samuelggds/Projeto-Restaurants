import api from './api';

export type PaymentProvider = 'MERCADO_PAGO' | 'PAGARME' | 'PAGBANK' | 'ASAAS';
export type PaymentConnection = {
  provider: PaymentProvider;
  connected: boolean;
  canConnect: boolean;
  readyForPix: boolean;
  readyForCard: boolean;
  status:
    | 'NOT_CONNECTED'
    | 'CONNECTED'
    | 'NEEDS_RECONNECT'
    | 'PENDING_APPROVAL'
    | 'ACTION_REQUIRED'
    | 'UNAVAILABLE';
  message: string;
  onboardingUrl?: string | null;
};
export type PaymentConnectionOverview = { connections: PaymentConnection[] };

export async function getPaymentConnections(): Promise<PaymentConnectionOverview> {
  const { data } = await api.get<PaymentConnectionOverview>('/settings/payment-connections');
  if (!Array.isArray(data?.connections)) throw new Error('Não foi possível verificar as conexões.');
  return data;
}
