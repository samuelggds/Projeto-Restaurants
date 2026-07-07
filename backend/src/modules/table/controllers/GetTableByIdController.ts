import getTableByIdService from "../services/GetTableByIdService.js";

class GetTableByIdController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;
      const { id } = req.params;

      const table = await getTableByIdService.execute({
        id,
        restaurantId,
      });

      return res.status(200).json(table);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new GetTableByIdController();
