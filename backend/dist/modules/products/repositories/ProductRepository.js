import prisma from "../../../config/prisma.js";
class ProductRepository {
    async create(data, restaurantId, db = prisma) {
        return db.product.create({
            data: {
                ...data,
                restaurantId,
            },
        });
    }
    async findByName(name, restaurantId, db = prisma) {
        return db.product.findFirst({
            where: {
                restaurantId,
                name: {
                    equals: String(name || "").trim(),
                    mode: "insensitive",
                },
            },
        });
    }
    async findAll(restaurantId, db = prisma) {
        return db.product.findMany({
            where: {
                restaurantId,
            },
            include: {
                category: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
    async update(id, data, restaurantId, db = prisma) {
        return db.product.updateMany({
            where: {
                id: Number(id),
                restaurantId,
            },
            data,
        });
    }
    async findById(id, restaurantId, db = prisma) {
        return db.product.findFirst({
            where: {
                id: Number(id),
                restaurantId,
            },
            include: {
                category: true,
            },
        });
    }
    async delete(id, restaurantId, db = prisma) {
        const productId = Number(id);
        const hasOrders = await db.orderItem.findFirst({
            where: {
                productId,
                order: {
                    restaurantId,
                },
            },
        });
        if (hasOrders) {
            throw new Error("Não é possível excluir um produto que já possui pedidos.");
        }
        return db.product.deleteMany({
            where: {
                id: productId,
                restaurantId,
            },
        });
    }
    async listRatingsByRestaurant(restaurantId, clientKey, db = prisma) {
        const summaries = await db.productRating.groupBy({
            by: ["productId"],
            where: {
                restaurantId,
            },
            _avg: {
                rating: true,
            },
            _count: {
                _all: true,
            },
        });
        let userRatingsMap = new Map();
        if (clientKey) {
            const userRatings = await db.productRating.findMany({
                where: {
                    restaurantId,
                    clientKey,
                },
                select: {
                    productId: true,
                    rating: true,
                },
            });
            userRatingsMap = new Map(userRatings.map((item) => [
                Number(item.productId),
                Number(item.rating),
            ]));
        }
        return summaries.map((item) => ({
            productId: Number(item.productId),
            average: Number(item._avg.rating || 0),
            count: Number(item._count._all || 0),
            userRating: Number(userRatingsMap.get(Number(item.productId)) || 0),
        }));
    }
    async upsertRating(data, db = prisma) {
        const { restaurantId, productId, clientKey, rating } = data;
        return db.productRating.upsert({
            where: {
                restaurantId_productId_clientKey: {
                    restaurantId,
                    productId,
                    clientKey,
                },
            },
            update: {
                rating,
            },
            create: {
                restaurantId,
                productId,
                clientKey,
                rating,
            },
        });
    }
    async getRatingSummary(productId, restaurantId, clientKey, db = prisma) {
        const grouped = await db.productRating.groupBy({
            by: ["productId"],
            where: {
                restaurantId,
                productId,
            },
            _avg: {
                rating: true,
            },
            _count: {
                _all: true,
            },
        });
        const summary = grouped[0];
        let userRating = 0;
        if (clientKey) {
            const mine = await db.productRating.findUnique({
                where: {
                    restaurantId_productId_clientKey: {
                        restaurantId,
                        productId,
                        clientKey,
                    },
                },
                select: {
                    rating: true,
                },
            });
            userRating = Number(mine?.rating || 0);
        }
        return {
            productId: Number(productId),
            average: Number(summary?._avg?.rating || 0),
            count: Number(summary?._count?._all || 0),
            userRating,
        };
    }
}
export default new ProductRepository();
