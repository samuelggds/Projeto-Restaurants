import deactivateEmployeeService from "../services/DeactivateEmployeeService.js";

class DeactivateEmployeeController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;

      const employee = await deactivateEmployeeService.execute(
        id,
        restaurantId,
      );
      return res.status(200).json(employee);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  }
}

export default new DeactivateEmployeeController();
