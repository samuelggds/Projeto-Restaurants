import prisma from "../../../config/prisma.js";
class TableRepository {
    async create(data, db = prisma) {
        return db.table.create({
            data,
        });
    }
    async findById(id, db = prisma) {
        return db.table.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                restaurant: true,
            },
        });
    }
    async findByNumber(number, restaurantId, db = prisma) {
        return db.table.findFirst({
            where: {
                number: Number(number),
                restaurantId,
            },
        });
    }
    async findAllByRestaurant(restaurantId, db = prisma) {
        return db.table.findMany({
            where: {
                restaurantId,
            },
            include: {
                _count: {
                    select: {
                        orders: true,
                        tableSessions: true,
                    },
                },
            },
            orderBy: {
                number: "asc",
            },
        });
    }
    async update(id, data) {
        return prisma.table.update({
            where: {
                id: Number(id),
            },
            data,
        });
    }
    async deactivate(id, db = prisma) {
        return db.table.update({
            where: {
                id: Number(id),
            },
            data: {
                active: false,
            },
        });
    }
}
export default new TableRepository();
