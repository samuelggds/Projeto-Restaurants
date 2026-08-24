import api from './api';

type WaiterCallFilters = {
  status?: 'WAITING' | 'IN_PROGRESS' | 'RESOLVED';
  type?: 'WAITER' | 'BILL';
  tableNumber?: number;
};

class WaiterCallsService {
  async createCall(type: 'WAITER' | 'BILL', sessionToken: string) {
    const normalizedToken = sessionToken.trim();
    if (!normalizedToken) throw new Error('Sessão da mesa não identificada.');
    const response = await api.post(
      '/waiter-calls',
      { type },
      { headers: { 'x-session-token': normalizedToken } },
    );
    return response.data;
  }

  async listCalls(filters?: WaiterCallFilters) {
    const response = await api.get('/waiter-calls', {
      params: filters && Object.keys(filters).length ? filters : undefined,
    });
    return Array.isArray(response.data) ? response.data : [];
  }

  async updateStatus(id: string | number, status: 'IN_PROGRESS' | 'RESOLVED') {
    const response = await api.patch(`/waiter-calls/${id}/status`, { status });
    return response.data;
  }
}

export default new WaiterCallsService();
