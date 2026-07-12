import employeeRepository from "../repositories/EmployeeRepository.js";
class UpdateEmployeeService {
    async execute({ id, restaurantId, name, phone, email, }) {
        const employee = await employeeRepository.findById(id, restaurantId);
        if (!employee) {
            throw new Error("Funcionário não encontrado!");
        }
        const emailExists = await employeeRepository.findByEmail(email);
        if (emailExists && emailExists.id !== employee.id) {
            throw new Error("Email já está em uso!");
        }
        return employeeRepository.update(id, { name, phone, email }, restaurantId);
    }
}
export default new UpdateEmployeeService();
