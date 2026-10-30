import api from './api';

export type NfcCardRecord = { id: string; displayCode: string; status: 'PENDING_WRITE' | 'READY' | 'ACTIVE' | 'REVOKED'; createdAt: string };
export type NfcCustomerRecord = {
  id: string; name: string; cpfMasked: string; phoneMasked: string; createdAt: string; cards: NfcCardRecord[];
};
export type LinkedNfcCustomer = {
  customerId: string; name: string; cpfMasked: string; phoneMasked: string;
  card: { id: string; displayCode: string };
  comanda: null | { id: string; tableNumber: number | null; openedAt: string;
    status: 'NO_VISIT' | 'WAITING_ORDER' | 'IN_SERVICE' | 'PENDING' | 'PAID';
    totalCents: number; paidCents: number; outstandingCents: number };
};
export type LinkedNfcCustomerPage = { customers: LinkedNfcCustomer[]; total: number; page: number; pageSize: number };
class NfcRegistrationService {
  async featureAccess() {
    const result = await api.get<{ enabled: boolean }>('/nfc-registration/feature-access');
    return result.data?.enabled === true;
  }
  async linkedCustomers(q = '', page = 1) {
    const response = await api.get<LinkedNfcCustomerPage>('/nfc-registration/linked-customers', { params: { q, page } });
    if (!response.data || !Array.isArray(response.data.customers) || !Number.isSafeInteger(response.data.total)) {
      throw new Error('Resposta de clientes NFC inválida.');
    }
    return response.data;
  }

  async list(page = 1) {
    const response = await api.get<{ customers: NfcCustomerRecord[]; page: number; total: number; pageSize: number }>('/nfc-registration/customers', { params: { page } });
    const result = response.data;
    if (
      !result ||
      !Array.isArray(result.customers) ||
      !Number.isSafeInteger(result.page) ||
      !Number.isSafeInteger(result.total) ||
      !Number.isSafeInteger(result.pageSize) ||
      result.page < 1 ||
      result.total < 0 ||
      result.pageSize < 1
    ) {
      throw new Error('Resposta de cadastro NFC inválida.');
    }
    return result;
  }
  async create(payload: { name: string; cpf: string; phone: string }) {
    const response = await api.post<{ customer: NfcCustomerRecord }>('/nfc-registration/customers', payload);
    return response.data.customer;
  }
  async lookup(cpf: string) {
    const response = await api.post<{ customer: NfcCustomerRecord | null }>('/nfc-registration/customers/lookup', { cpf });
    return response.data.customer;
  }
  async issue(customerId: string) {
    const response = await api.post<{ card: NfcCardRecord; ndefUrl: string; warning: string }>(`/nfc-registration/customers/${customerId}/cards`);
    return response.data;
  }
  async activate(cardId: string, token: string) {
    const response = await api.post<{ card: NfcCardRecord }>(`/nfc-registration/cards/${cardId}/activate`, { token });
    return response.data.card;
  }
  async resolve(token: string) {
    const response = await api.post<{ card: { id: string; customerId: string; displayCode: string; status: string } }>('/nfc-registration/cards/resolve', { token });
    return response.data.card;
  }
  async provision() {
    const result = await api.post<{ card: NfcCardRecord; ndefUrl: string }>('/nfc-registration/cards/provision', {});
    return result.data;
  }
  async prepare(cardId: string, token: string) {
    const result = await api.post<{ card: NfcCardRecord }>(`/nfc-registration/cards/${cardId}/prepare`, { token });
    return result.data.card;
  }
  async intake(data: {
    token: string; name?: string; cpf?: string; phone?: string;
    customerId?: string; tableNumber?: number | null;
  }) {
    const result = await api.post<{ assignment: { customerId: string; cardId: string; displayCode: string; tableNumber: number | null } }>(
      '/nfc-registration/cards/intake', data,
    );
    return result.data.assignment;
  }
  async returnPaidCard(token: string, cpf: string, comandaId?: string) {
    const response = await api.post<{ released: true; cardId: string; displayCode: string; status: 'READY' }>(
      '/nfc-registration/cards/return', { token, cpf, ...(comandaId ? { comandaId } : {}) },
    );
    if (!response.data?.released || response.data.status !== 'READY') {
      throw new Error('Liberação do cartão não foi confirmada pelo servidor.');
    }
    return response.data;
  }
  async revoke(cardId: string, reason: string) {
    await api.post(`/nfc-registration/cards/${cardId}/revoke`, { reason });
  }
}
export default new NfcRegistrationService();
