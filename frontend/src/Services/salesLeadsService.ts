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
};

export default salesLeadsService;
