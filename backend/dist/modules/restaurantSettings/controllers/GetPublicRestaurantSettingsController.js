import getPublicRestaurantSettingsService from "../services/GetPublicRestaurantSettingsService.js";
class GetPublicRestaurantSettingsController {
    async handle(req, res) {
        try {
            const restaurantId = Array.isArray(req.params.restaurantId)
                ? req.params.restaurantId[0]
                : req.params.restaurantId;
            const slug = Array.isArray(req.params.slug)
                ? req.params.slug[0]
                : req.params.slug;
            const settings = await getPublicRestaurantSettingsService.execute({
                restaurantId,
                slug,
            });
            return res.status(200).json(settings);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao buscar configuracoes publicas do restaurante",
            });
        }
    }
}
export default new GetPublicRestaurantSettingsController();
