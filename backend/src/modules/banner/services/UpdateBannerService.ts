import bannerRepository from "../repositories/BannerRepository.js";

type UpdateBannerPayload = {
  id: number | string;
  title?: string;
  image?: string;
};

class UpdateBannerService {
  async execute({ id, title, image }: UpdateBannerPayload) {
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
