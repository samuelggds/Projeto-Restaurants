import updateTableService from "../services/UpdateTableService.js";

class UpdateTableController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;
      const { number } = req.body;

      const table = await updateTableService.execute({
        id,
        restaurantId,
        number,
      });

      return res.status(200).json(table);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new UpdateTableController();
