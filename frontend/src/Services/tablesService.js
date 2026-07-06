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
}

export default new TablesService();
