import employeeRepository from '../repositories/EmployeeRepository.js';

class DeactivateEmployeeService {
  async execute(id: number | string, restaurantId: number) {
    const employee = await employeeRepository.findById(id, restaurantId);

    if (!employee) {
      throw new Error('Funcionário não encontrado!');
    }

    return employeeRepository.deactivate(id, restaurantId);
  }
}

export default new DeactivateEmployeeService();
