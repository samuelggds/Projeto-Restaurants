import employeeRepository from "../repositories/EmployeeRepository.js";

class ReactivateEmployeeService {
  async execute(id: number | string, restaurantId: number) {
    const employee = await employeeRepository.findById(id, restaurantId);

    if (!employee) {
      throw new Error("Funcionário não encontrado!");
    }

    return employeeRepository.reactivate(id, restaurantId);
  }
}

export default new ReactivateEmployeeService();
