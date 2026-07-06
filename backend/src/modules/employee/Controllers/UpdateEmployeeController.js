import updateEmployeeService from "../Services/UpdateEmployeeService.js";

class UpdateEmployeeController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;

      const { id } = req.params;

      const { name, email, phone } = req.body;

      const employee = await updateEmployeeService.execute({
        id,
        restaurantId,
        name,
        email,
        phone,
      });

      return res.status(200).json(employee);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new UpdateEmployeeController();
