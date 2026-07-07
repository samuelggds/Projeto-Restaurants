import createRestaurantSettingsService from "../services/CreateRestaurantSettingsService.js";

class CreateRestaurantSettingsController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;

      const {
        deliveryFee,
        minimumOrder,
        pixProvider,
        pixKey,
        whatsapp,
        instagram,
        facebook,
        restaurantName,
        restaurantLogo,
        restaurantCoverImage,
      } = req.body;

      const settings = await createRestaurantSettingsService.execute({
        restaurantId,
        deliveryFee,
        minimumOrder,
        pixProvider,
        pixKey,
        whatsapp,
        instagram,
        facebook,
        restaurantName,
        restaurantLogo,
        restaurantCoverImage,
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
