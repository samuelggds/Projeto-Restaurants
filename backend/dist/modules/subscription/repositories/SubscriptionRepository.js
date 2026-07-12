import prisma from "../../../config/prisma.js";
class SubscriptionRepository {
    async create(data, tx = prisma) {
        return tx.subscription.create({
            data,
        });
    }
    async findByRestaurantId(restaurantId) {
        return prisma.subscription.findUnique({
            where: {
                restaurantId: Number(restaurantId),
            },
        });
    }
    async update(restaurantId, data, tx = prisma) {
        return tx.subscription.update({
            where: {
                restaurantId: Number(restaurantId),
            },
            data,
        });
    }
}
export default new SubscriptionRepository();
