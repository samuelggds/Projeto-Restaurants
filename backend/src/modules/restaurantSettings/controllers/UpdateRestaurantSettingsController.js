import updateRestaurantSettingsService from "../services/UpdateRestaurantSettingsService.js";

class UpdateRestaurantSettingsController {
  async handle(req, res) {
    try {
      const restaurantId = req.user.restaurantId;

      const { deliveryFee, minimumOrder, pixKey, instagram, facebook } =
        req.body;

      const settings = await updateRestaurantSettingsService.execute({
        restaurantId,
        deliveryFee,
        minimumOrder,
        pixKey,
        instagram,
        facebook,
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
