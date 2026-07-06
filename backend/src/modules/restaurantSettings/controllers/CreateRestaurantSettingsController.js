import createRestaurantSettingsService from "../services/CreateRestaurantSettingsService.js";

class CreateRestaurantSettingsController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;

      const { deliveryFee, minimumOrder, pixKey, instagram, facebook } =
        req.body;

      const settings = await createRestaurantSettingsService.execute({
        restaurantId,
        deliveryFee,
        minimumOrder,
        pixKey,
        instagram,
        facebook,
      });

      return res.status(201).json(settings);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new CreateRestaurantSettingsController();
