import listBannerService from "../services/ListBannerService.js";
class ListBannerController {
    async handle(req, res) {
        try {
            const restaurantId = req.user.restaurantId;
            const banners = await listBannerService.execute({
                restaurantId,
            });
            return res.status(200).json(banners);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao listar banners",
            });
        }
    }
}
export default new ListBannerController();
