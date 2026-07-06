import updateBannerService from "../services/UpdateBannerService.js";

class UpdateBannerController {
  async handle(req, res) {
    try {
      const { id } = req.params;
      const { title, image } = req.body;

      const banner = await updateBannerService.execute({
        id,
        title,
        image,
      });

      return res.status(200).json(banner);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new UpdateBannerController();
