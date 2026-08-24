import api from './api';

class TableSessionService {
  async getCurrentSession() {
    const response = await api.get('/table-sessions/current');
    return response.data;
  }

  async requestPinAssistance({ tableId, tableNumber, restaurantId, restaurantSlug }) {
    const response = await api.post('/table-sessions/request-pin', {
      tableId,
      tableNumber,
      restaurantId,
      restaurantSlug,
    });

    return response.data;
  }

  async joinOpenSession({ tableId, tableNumber, tableToken, restaurantId, restaurantSlug }) {
    const response = await api.post('/table-sessions/join', {
      tableId,
      tableNumber,
      tableToken,
      restaurantId,
      restaurantSlug,
    });

    return response.data;
  }

  async validatePin({ tableId, tableNumber, restaurantId, restaurantSlug, pin }) {
    const response = await api.post('/table-sessions/validate', {
      tableId,
      tableNumber,
      restaurantId,
      restaurantSlug,
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
