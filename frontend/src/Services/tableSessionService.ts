import api from './api';

class TableSessionService {
  async getCurrentSession() {
    const response = await api.get('/table-sessions/current');
    return response.data;
  }

  async requestPinAssistance(tableId) {
    const response = await api.post('/table-sessions/request-pin', {
      tableId,
    });

    return response.data;
  }

  async validatePin({ tableId, pin }) {
    const response = await api.post('/table-sessions/validate', {
      tableId,
      pin,
    });

    return response.data;
  }

  async listOpenSessions() {
    const response = await api.get('/table-sessions/open');
    return response.data;
  }

  async openSession(tableId) {
    const response = await api.post('/table-sessions/open', { tableId });
    return response.data;
  }

  async closeSession(sessionId) {
    const response = await api.patch(`/table-sessions/${sessionId}/close`);
    return response.data;
  }
}

export default new TableSessionService();
