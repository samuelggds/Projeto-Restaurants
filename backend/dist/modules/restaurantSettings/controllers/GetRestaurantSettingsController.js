import getRestaurantSettingsService from "../services/GetRestaurantSettingsService.js";
class GetRestaurantSettingsController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const settings = await getRestaurantSettingsService.execute({
                restaurantId,
            });
            return res.status(200).json(settings);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao buscar configuracoes do restaurante",
            });
        }
    }
}
export default new GetRestaurantSettingsController();
