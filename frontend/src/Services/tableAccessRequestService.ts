import api from './api';

export type TableAccessRequest = {
  publicId: string;
  restaurantId: number;
  tableId: number;
  tableSessionId: number;
  tableNumber: number;
  displayName: string;
  phone: string;
  status: 'WAITING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONSUMED';
  expiresAt: string;
  createdAt: string;
};

class TableAccessRequestService {
  async checkStatus(input: {
    requestId: string;
    requestToken: string;
    restaurantId: number;
  }) {
    const response = await api.post('/table-sessions/access-requests/status', input);
    return response.data;
  }

  async listPending(): Promise<TableAccessRequest[]> {
    const response = await api.get('/table-sessions/access-requests');
    return Array.isArray(response.data?.requests) ? response.data.requests : [];
  }

  async decide(requestId: string, decision: 'APPROVE' | 'REJECT') {
    const response = await api.patch(`/table-sessions/access-requests/${requestId}`, {
      decision,
    });
    return response.data?.request as TableAccessRequest;
  }
}

export default new TableAccessRequestService();
