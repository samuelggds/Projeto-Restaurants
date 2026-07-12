import prisma from "../../../config/prisma.js";
class CouponRepository {
    async create(data) {
        return prisma.coupon.create({
            data,
        });
    }
    async findAllByRestaurant(restaurantId) {
        return prisma.coupon.findMany({
            where: {
                restaurantId: Number(restaurantId),
            },
            orderBy: {
                id: "desc",
            },
        });
    }
    async findById(id) {
        return prisma.coupon.findUnique({
            where: {
                id: Number(id),
            },
        });
    }
    async findByCode(code, restaurantId) {
        return prisma.coupon.findFirst({
            where: {
                code,
                restaurantId: Number(restaurantId),
            },
        });
    }
    async update(id, data) {
        return prisma.coupon.update({
            where: {
                id: Number(id),
            },
            data,
        });
    }
    async delete(id) {
        return prisma.coupon.delete({
            where: {
                id: Number(id),
            },
        });
    }
}
export default new CouponRepository();
