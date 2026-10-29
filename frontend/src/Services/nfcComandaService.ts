import api from './api';
export type NfcComandaItem = {
  id: string; kind: 'COVER' | 'ORDER'; description: string; quantity: number;
  unitPriceCents: number; totalCents: number; createdAt: string;
};
export type NfcComandaPayment = {
  id: string; method: 'DINHEIRO' | 'PIX' | 'CARTAO';
  amountCents: number; status: 'PENDING' | 'CONFIRMED' | 'REVERSED';
  createdAt: string; confirmedAt: string | null; reversedAt: string | null;
};
export type NfcComanda = {
  id: string; customerId: string; cardId: string | null; tableNumber: number | null;
  status: 'OPEN' | 'UNPAID' | 'PAID'; totalCents: number; paidCents: number;
  outstandingCents: number; openedAt: string; dueAt: string; closedAt: string | null;
  paidAt: string | null; items: NfcComandaItem[]; payments: NfcComandaPayment[];
};
export type NfcCustomerComandas = {
  customerId: string; blocked: boolean; outstandingCents: number;
  hasOpenComanda: boolean; comandas: NfcComanda[];
};
class NfcComandaService {
  async open(customerId: string, cardId: string, tableNumber?: number | null, idempotencyKey?: string) {
    const result = await api.post<{ comanda: NfcComanda }>('/nfc-comandas/open', {
      customerId, cardId, tableNumber: tableNumber ?? null,
    }, { headers: { 'Idempotency-Key': idempotencyKey || crypto.randomUUID().replace(/-/g, '') } });
    return result.data.comanda;
  }
  async customerComandas(customerId: string): Promise<NfcCustomerComandas> {
    const result = await api.get<NfcCustomerComandas>(`/nfc-comandas/customers/${encodeURIComponent(customerId)}`);
    if (!result.data || !Array.isArray(result.data.comandas) || !Number.isSafeInteger(result.data.outstandingCents)) {
      throw new Error('Dados financeiros NFC inválidos.');
    }
    return result.data;
  }
  async sendVisitAccessCode(comandaId: string) {
    const result = await api.post<{ queued: boolean; expiresAt: string }>(
      `/nfc-cashless/staff/comandas/${encodeURIComponent(comandaId)}/access-code`,
      { whatsappConsent: true },
    );
    if (!result.data?.queued) throw new Error('Não foi possível enfileirar o acesso no WhatsApp.');
    return result.data;
  }
  async confirmCash(paymentId: string) {
    const result = await api.post(`/nfc-comandas/payments/${encodeURIComponent(paymentId)}/confirm-cash`, {});
    return result.data;
  }
}
export default new NfcComandaService();
