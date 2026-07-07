import getRestaurantSettingsService from "../services/GetRestaurantSettingsService.js";

class GetRestaurantSettingsController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;

      const settings = await getRestaurantSettingsService.execute({
        restaurantId,
      });

      return res.status(200).json(settings);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new GetRestaurantSettingsController();
