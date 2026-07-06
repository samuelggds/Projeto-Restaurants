import bannerRepository from "../repositories/BannerRepository.js";

class DeleteBannerService {
  async execute({ id }) {
    const banner = await bannerRepository.findById(id);

    if (!banner) {
      throw new Error("Banner não encontrado");
    }

    await bannerRepository.delete(id);

    return { message: "Banner removido com sucesso" };
  }
}

export default new DeleteBannerService();
