import createEmployeeService from "../services/CreateEmployeeService.js";
import { EmployeeUserSchema } from "../../../validators/EmployeeSchema.js";

class CreateEmployeeController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;

      const { name, email, password, confirmPassword, phone, role } = req.body;

      EmployeeUserSchema.parse({
        name,
        email,
        password,
        confirmPassword,
        phone,
        role,
      });

      const employee = await createEmployeeService.execute({
        name,
        email,
        password,
        confirmPassword,
        phone,
        role,
        restaurantId,
      });

      return res.status(201).json(employee);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new CreateEmployeeController();
