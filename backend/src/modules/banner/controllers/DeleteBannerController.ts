import deleteBannerService from "../services/DeleteBannerService.js";

class DeleteBannerController {
  async handle(req, res) {
    try {
      const { id } = req.params;

      const result = await deleteBannerService.execute({
        id,
      });

      return res.status(200).json(result);
    } catch (error) {
      return res.status(400).json({
        error: error.message,
      });
    }
  }
}

export default new DeleteBannerController();
