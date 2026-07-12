import bannerRepository from "../repositories/BannerRepository.js";
class CreateBannerService {
    async execute({ title, image, restaurantId }) {
        if (!title || !image) {
            throw new Error("Título e imagem são obrigatórios");
        }
        return await bannerRepository.create({
            title,
            image,
            restaurantId: Number(restaurantId),
        });
    }
}
export default new CreateBannerService();
