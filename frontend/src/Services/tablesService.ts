import api from "./api";

class TablesService {
  async listTables() {
    const response = await api.get("/tables");
    return response.data;
  }

  async createTable(payload) {
    const response = await api.post("/tables", payload);
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
    const response = await api.post("/sessions-tables/open", {
      tableId,
    });
    return response.data;
  }
}

export default new TablesService();
