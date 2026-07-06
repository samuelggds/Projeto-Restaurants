import employeeRepository from "../repositories/EmployeeRepository.js";

class DeactivateEmployeeService {
  async execute(id, restaurantId) {
    const employee = await employeeRepository.findById(id, restaurantId);

    if (!employee) {
      throw new Error("Funcionário não encontrado!");
    }

    return employeeRepository.deactivate(id, restaurantId);
  }
}

export default new DeactivateEmployeeService();
