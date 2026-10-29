import api from './api';

export type NfcCardRecord = { id: string; displayCode: string; status: 'PENDING_WRITE' | 'ACTIVE' | 'REVOKED'; createdAt: string };
export type NfcCustomerRecord = {
  id: string; name: string; cpfMasked: string; phoneMasked: string; createdAt: string; cards: NfcCardRecord[];
};
class NfcRegistrationService {
  async list(page = 1) {
    const response = await api.get<{ customers: NfcCustomerRecord[]; page: number; total: number; pageSize: number }>('/nfc-registration/customers', { params: { page } });
    return response.data;
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
  async revoke(cardId: string, reason: string) {
    await api.post(`/nfc-registration/cards/${cardId}/revoke`, { reason });
  }
}
export default new NfcRegistrationService();
