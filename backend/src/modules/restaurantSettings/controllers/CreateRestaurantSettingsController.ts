import { Request, Response } from "express";
import createRestaurantSettingsService from "../services/CreateRestaurantSettingsService.js";

class CreateRestaurantSettingsController {
  async handle(req: Request, res: Response) {
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
    } catch (error: unknown) {
      return res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : "Erro ao criar configuracoes do restaurante",
      });
    }
  }
}

export default new CreateRestaurantSettingsController();
