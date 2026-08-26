import api from './api';
import type { TableAccountAdminSettings } from '../pages/admin/types';
import type {
  CreateTablePaymentResult,
  TableAccountSnapshot,
  TablePaymentDraft,
} from '../pages/Home/domain/tableAccount';
import { buildTablePaymentPayload } from '../pages/Home/domain/tableAccount';

class TableAccountService {
  async getCurrent(sessionPublicId: string): Promise<TableAccountSnapshot> {
    const response = await api.get(`/table-accounts/sessions/${sessionPublicId}`);
    return response.data;
  }

  async createPayment(
    sessionPublicId: string,
    payment: TablePaymentDraft,
    idempotencyKey: string,
  ): Promise<CreateTablePaymentResult> {
    const response = await api.post(
      `/table-accounts/sessions/${sessionPublicId}/payments`,
      buildTablePaymentPayload(payment),
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
    return response.data;
  }

  async cancelPayment(sessionPublicId: string, paymentPublicId: string) {
    const response = await api.patch(
      `/table-accounts/sessions/${sessionPublicId}/payments/${paymentPublicId}/cancel`,
    );
    return response.data;
  }

  async getSettings(): Promise<TableAccountAdminSettings> {
    const response = await api.get('/table-accounts/settings');
    return response.data;
  }

  async updateSettings(settings: TableAccountAdminSettings): Promise<TableAccountAdminSettings> {
    const response = await api.patch('/table-accounts/settings', settings);
    return response.data;
  }

  async listAdminSessions() {
    const response = await api.get('/table-accounts/admin/sessions');
    return response.data;
  }

  async getAdminSnapshot(sessionPublicId: string) {
    const response = await api.get(`/table-accounts/sessions/${sessionPublicId}/admin`);
    return response.data;
  }

  async confirmManualPayment(paymentPublicId: string) {
    const response = await api.post(`/table-accounts/payments/${paymentPublicId}/confirm-manual`);
    return response.data;
  }

  async refundPayment(paymentPublicId: string, reason: string) {
    const response = await api.post(`/table-accounts/payments/${paymentPublicId}/refund`, {
      reason,
    });
    return response.data;
  }

  async forceCloseSession(tableSessionId: number, reason: string) {
    const response = await api.patch(`/table-sessions/${tableSessionId}/force-close`, { reason });
    return response.data;
  }
}

export default new TableAccountService();
