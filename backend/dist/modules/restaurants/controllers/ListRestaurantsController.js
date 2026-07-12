import listRestaurantsService from "../services/ListRestaurantsService.js";
class ListRestaurantsController {
    async handle(req, res) {
        try {
            const restaurants = await listRestaurantsService.execute();
            return res.status(200).json(restaurants);
        }
        catch (error) {
            return res.status(400).json({
                message: error instanceof Error
                    ? error.message
                    : "Erro ao listar restaurantes",
            });
        }
    }
}
export default new ListRestaurantsController();
