import prisma from "../../../config/prisma.js";
class RestaurantSettingsRepository {
    async findByRestaurantId(restaurantId) {
        return prisma.restaurantSettings.findUnique({
            where: {
                restaurantId: Number(restaurantId),
            },
            include: {
                restaurant: {
                    select: {
                        name: true,
                        slug: true,
                        logo: true,
                        coverImage: true,
                        whatsapp: true,
                    },
                },
            },
        });
    }
    async findRestaurantById(restaurantId) {
        return prisma.restaurant.findUnique({
            where: {
                id: Number(restaurantId),
            },
            select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                coverImage: true,
                whatsapp: true,
            },
        });
    }
    async findPublicByRestaurantId(restaurantId) {
        return prisma.restaurantSettings.findUnique({
            where: {
                restaurantId: Number(restaurantId),
            },
            select: {
                restaurantId: true,
                deliveryFee: true,
                minimumOrder: true,
                pixProvider: true,
                pixKey: true,
                instagram: true,
                restaurant: {
                    select: {
                        name: true,
                        slug: true,
                        logo: true,
                        coverImage: true,
                    },
                },
            },
        });
    }
    async create(data) {
        return prisma.restaurantSettings.create({
            data,
        });
    }
    async update(restaurantId, data) {
        return prisma.restaurantSettings.update({
            where: {
                restaurantId: Number(restaurantId),
            },
            data,
        });
    }
}
export default new RestaurantSettingsRepository();
