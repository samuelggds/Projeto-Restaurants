import api from './api';

class TablesService {
  async listTables() {
    const response = await api.get('/tables');
    return response.data;
  }

  async resolvePublicTable({ tableNumber, tableToken, tableId, restaurantId, slug }) {
    const response = await api.get('/tables/public/resolve', {
      params: {
        tableNumber,
        tableToken,
        ...(tableId ? { tableId } : {}),
        ...(restaurantId ? { restaurantId } : {}),
        ...(slug ? { slug } : {}),
      },
    });
    return response.data;
  }

  async createTable(payload) {
    const response = await api.post('/tables', payload);
    return response.data;
  }

  async deactivateTable(tableId) {
    const response = await api.patch(`/tables/${tableId}`);
    return response.data;
  }

  async activateTable(tableId, number) {
    const response = await api.put(`/tables/${tableId}`, {
      number,
      active: true,
    });
    return response.data;
  }

  async openTableSession(tableId) {
    const response = await api.post('/table-sessions/open', {
      tableId,
    });
    return response.data;
  }

  async closeTableSession(sessionId) {
    const response = await api.patch(`/table-sessions/${sessionId}/close`);
    return response.data;
  }
}

export default new TablesService();
