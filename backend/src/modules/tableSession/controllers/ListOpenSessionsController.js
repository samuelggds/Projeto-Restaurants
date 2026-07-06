import listOpenSessionService from "../services/ListOpenSessionService.js";

class ListOpenSessionsController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;

      const sessions = await listOpenSessionService.execute({
        restaurantId,
      });

      return res.status(200).json(sessions);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new ListOpenSessionsController();
