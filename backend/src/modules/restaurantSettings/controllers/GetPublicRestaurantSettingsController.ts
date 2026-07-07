import getPublicRestaurantSettingsService from "../services/GetPublicRestaurantSettingsService.js";

class GetPublicRestaurantSettingsController {
  async handle(req, res) {
    try {
      const settings = await getPublicRestaurantSettingsService.execute({
        restaurantId: req.params.restaurantId,
      });

      return res.status(200).json(settings);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new GetPublicRestaurantSettingsController();
