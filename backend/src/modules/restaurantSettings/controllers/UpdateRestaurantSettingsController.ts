import updateRestaurantSettingsService from "../services/UpdateRestaurantSettingsService.js";

class UpdateRestaurantSettingsController {
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

      const settings = await updateRestaurantSettingsService.execute({
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

      return res.status(200).json(settings);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new UpdateRestaurantSettingsController();
