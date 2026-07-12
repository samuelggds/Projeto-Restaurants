import createBannerService from "../services/CreateBannerService.js";
class CreateBannerController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const { title, image } = req.body;
            const banner = await createBannerService.execute({
                title,
                image,
                restaurantId,
            });
            return res.status(201).json(banner);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao criar banner",
            });
        }
    }
}
export default new CreateBannerController();
