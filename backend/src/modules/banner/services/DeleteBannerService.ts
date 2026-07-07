import bannerRepository from "../repositories/BannerRepository.js";

type DeleteBannerPayload = {
  id: number | string;
};

class DeleteBannerService {
  async execute({ id }: DeleteBannerPayload) {
    const banner = await bannerRepository.findById(id);

    if (!banner) {
      throw new Error("Banner não encontrado");
    }

    await bannerRepository.delete(id);

    return { message: "Banner removido com sucesso" };
  }
}

export default new DeleteBannerService();
