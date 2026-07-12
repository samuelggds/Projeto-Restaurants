import getRestaurantsMetricsService from "../services/GetRestaurantsMetricsService.js";
class GetRestaurantsMetricsController {
    async handle(req, res) {
        try {
            const metrics = await getRestaurantsMetricsService.execute();
            return res.status(200).json(metrics);
        }
        catch (error) {
            return res.status(400).json({
                message: error instanceof Error
                    ? error.message
                    : "Erro ao buscar metricas de restaurantes",
            });
        }
    }
}
export default new GetRestaurantsMetricsController();
