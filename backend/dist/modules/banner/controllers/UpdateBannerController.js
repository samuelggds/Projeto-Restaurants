import updateBannerService from "../services/UpdateBannerService.js";
class UpdateBannerController {
    async handle(req, res) {
        try {
            const id = Array.isArray(req.params.id)
                ? req.params.id[0]
                : req.params.id;
            const { title, image } = req.body;
            const banner = await updateBannerService.execute({
                id,
                title,
                image,
            });
            return res.status(200).json(banner);
        }
        catch (error) {
            return res.status(400).json({
                error: error instanceof Error ? error.message : "Erro ao atualizar banner",
            });
        }
    }
}
export default new UpdateBannerController();
