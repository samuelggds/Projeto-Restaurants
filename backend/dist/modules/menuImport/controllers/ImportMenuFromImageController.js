import importMenuFromImageService from "../services/ImportMenuFromImageService.js";
class ImportMenuFromImageController {
    async handle(req, res) {
        try {
            const { imageUrl, restaurantId: bodyRestaurantId } = req.body;
            const resolvedRestaurantId = Number(req.user?.restaurantId || bodyRestaurantId || 0);
            const summary = await importMenuFromImageService.execute({
                imageUrl,
                restaurantId: resolvedRestaurantId,
            });
            return res.status(201).json(summary);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error
                    ? error.message
                    : "Erro ao importar cardapio a partir da imagem",
            });
        }
    }
}
export default new ImportMenuFromImageController();
