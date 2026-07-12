import employeeRepository from "../repositories/EmployeeRepository.js";
class ListEmployeeService {
    async execute(restaurantId) {
        const normalizedRestaurantId = Number(restaurantId);
        if (!normalizedRestaurantId) {
            throw new Error("RestaurantId obrigatório");
        }
        return employeeRepository.findAllByRestaurant(normalizedRestaurantId);
    }
}
export default new ListEmployeeService();
