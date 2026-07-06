import employeeRepository from "../repositories/EmployeeRepository.js";

class ListEmployeeService {
  async execute(restaurantId) {
    if (!restaurantId) {
      throw new Error("RestaurantId obrigatório");
    }

    return employeeRepository.findAllByRestaurant(restaurantId);
  }
}

export default new ListEmployeeService();
