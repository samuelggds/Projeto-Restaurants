import api from "./api";

class EmployeesService {
  async listEmployees() {
    const response = await api.get("/employees");
    return response.data;
  }

  async createEmployee(payload) {
    const response = await api.post("/employees", payload);
    return response.data;
  }

  async deactivateEmployee(employeeId) {
    const response = await api.patch(`/employees/${employeeId}`);
    return response.data;
  }
}

export default new EmployeesService();
