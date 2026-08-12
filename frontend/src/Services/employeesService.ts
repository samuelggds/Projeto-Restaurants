import api from "./api";

class EmployeesService {
  async listEmployees() {
    const response = await api.get("/employees");
    return response.data;
  }

  async createEmployee(payload: Record<string, unknown>) {
    const response = await api.post("/employees", payload);
    return response.data;
  }

  async updateEmployee(
    employeeId: string | number,
    payload: Record<string, unknown>,
  ) {
    const response = await api.put(`/employees/${employeeId}`, payload);
    return response.data;
  }

  async deactivateEmployee(employeeId: string | number) {
    const response = await api.patch(`/employees/${employeeId}`);
    return response.data;
  }

  async reactivateEmployee(employeeId: string | number) {
    const response = await api.patch(`/employees/${employeeId}/reactivate`);
    return response.data;
  }
}

export default new EmployeesService();
