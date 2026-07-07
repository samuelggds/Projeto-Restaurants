import bannerRepository from "../repositories/BannerRepository.js";

class UpdateBannerService {
  async execute({ id, title, image }) {
    const banner = await bannerRepository.findById(id);

    if (!banner) {
      throw new Error("Banner não encontrado");
    }

    return await bannerRepository.update(id, {
      title,
      image,
    });
  }
}

export default new UpdateBannerService();
