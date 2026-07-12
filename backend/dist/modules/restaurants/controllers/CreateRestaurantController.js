import createRestaurantService from "../services/CreateRestaurantService.js";
class CreateRestaurantController {
    async handle(req, res) {
        try {
            const { restaurant, admin } = req.body;
            const result = await createRestaurantService.execute({
                restaurant,
                admin,
            });
            return res.status(201).json(result);
        }
        catch (error) {
            return res.status(400).json({
                message: error instanceof Error ? error.message : "Erro ao criar restaurante",
            });
        }
    }
}
export default new CreateRestaurantController();
