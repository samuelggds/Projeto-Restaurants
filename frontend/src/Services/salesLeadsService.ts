import api from './api';
import type {
  SalesLead,
  SalesLeadStatus,
  SalesLeadsQuery,
  SalesLeadsResult,
} from '../pages/super_admin/salesLeadTypes';

const salesLeadsService = {
  async list(query: SalesLeadsQuery, signal?: AbortSignal): Promise<SalesLeadsResult> {
    const response = await api.get('/super-admin/sales-leads', { params: query, signal });
    return response.data;
  },

  async updateStatus(id: string, status: SalesLeadStatus): Promise<SalesLead> {
    const response = await api.patch(`/super-admin/sales-leads/${encodeURIComponent(id)}/status`, {
      status,
    });
    return response.data;
  },

  async getCommercialWhatsappSettings() {
    return (await api.get('/super-admin/sales-leads/commercial-whatsapp/settings')).data;
  },

  async updateCommercialWhatsappSettings(input: unknown) {
    return (await api.put('/super-admin/sales-leads/commercial-whatsapp/settings', input)).data;
  },

  async getCommercialWhatsappConnection() {
    return (await api.get('/super-admin/sales-leads/commercial-whatsapp/connection')).data;
  },

  async connectCommercialWhatsapp() {
    return (await api.post('/super-admin/sales-leads/commercial-whatsapp/connection')).data;
  },

  async getCommercialWhatsappQrCode() {
    return (await api.post('/super-admin/sales-leads/commercial-whatsapp/connection/qr')).data;
  },

  async refreshCommercialWhatsapp() {
    return (await api.post('/super-admin/sales-leads/commercial-whatsapp/connection/refresh')).data;
  },

  async disconnectCommercialWhatsapp() {
    return (await api.delete('/super-admin/sales-leads/commercial-whatsapp/connection')).data;
  },

  async listCommercialWhatsappConversations() {
    return (await api.get('/super-admin/sales-leads/commercial-whatsapp/conversations')).data;
  },

  async setCommercialWhatsappMode(id: string, mode: 'BOT' | 'HUMAN') {
    return (
      await api.patch(
        `/super-admin/sales-leads/commercial-whatsapp/conversations/${encodeURIComponent(id)}/mode`,
        { mode },
      )
    ).data;
  },

  async sendCommercialWhatsappMessage(id: string, message: string) {
    return (
      await api.post(
        `/super-admin/sales-leads/commercial-whatsapp/conversations/${encodeURIComponent(id)}/messages`,
        { message },
      )
    ).data;
  },
};

export default salesLeadsService;
