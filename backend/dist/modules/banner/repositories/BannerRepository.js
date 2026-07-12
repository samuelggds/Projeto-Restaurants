import prisma from "../../../config/prisma.js";
class BannerRepository {
    async create(data) {
        return prisma.banner.create({
            data,
        });
    }
    async findAllByRestaurant(restaurantId) {
        return prisma.banner.findMany({
            where: {
                restaurantId: Number(restaurantId),
            },
            orderBy: {
                id: "desc",
            },
        });
    }
    async findById(id) {
        return prisma.banner.findUnique({
            where: {
                id: Number(id),
            },
        });
    }
    async update(id, data) {
        return prisma.banner.update({
            where: {
                id: Number(id),
            },
            data,
        });
    }
    async delete(id) {
        return prisma.banner.delete({
            where: {
                id: Number(id),
            },
        });
    }
}
export default new BannerRepository();
