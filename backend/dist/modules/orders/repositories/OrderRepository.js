import { PaymentMethod } from "@prisma/client";
import prisma from "../../../config/prisma.js";
class OrderRepository {
    async create(data, db = prisma) {
        return db.order.create({
            data,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        whatsapp: true,
                    },
                },
                table: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
    }
    async findAll(restaurantId, status, db = prisma) {
        return db.order.findMany({
            where: {
                restaurantId,
                NOT: {
                    AND: [
                        {
                            paid: false,
                        },
                        {
                            paymentMethod: {
                                in: [PaymentMethod.PIX, PaymentMethod.CARTAO],
                            },
                        },
                        {
                            payOnDelivery: {
                                not: true,
                            },
                        },
                    ],
                },
                ...(status && { status }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        whatsapp: true,
                    },
                },
                table: true,
                items: {
                    include: {
                        product: true,
                    },
                },
                issueThread: {
                    select: {
                        orderId: true,
                        isResolved: true,
                        messages: {
                            orderBy: {
                                sentAt: "desc",
                            },
                            take: 40,
                            select: {
                                senderType: true,
                                message: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
    async updateStatus(id, status, restaurantId, db = prisma) {
        await db.order.updateMany({
            where: {
                id: Number(id),
                restaurantId,
            },
            data: {
                status,
            },
        });
        return this.findById(id, restaurantId, db);
    }
    async confirmPayment(id, restaurantId, db = prisma) {
        await db.order.updateMany({
            where: {
                id: Number(id),
                restaurantId,
            },
            data: {
                paid: true,
                paidAt: new Date(),
                paymentConfirmationPin: null,
                paymentConfirmationPinExpiresAt: null,
            },
        });
        return this.findById(id, restaurantId, db);
    }
    async confirmPixPayment(id, restaurantId, { paymentProof, paymentProofImage, } = {}, db = prisma) {
        await db.order.updateMany({
            where: {
                id: Number(id),
                restaurantId,
            },
            data: {
                paid: true,
                paidAt: new Date(),
                paymentProof: String(paymentProof || "").trim() || null,
                paymentProofImage: String(paymentProofImage || "").trim() || null,
                paymentConfirmationPin: null,
                paymentConfirmationPinExpiresAt: null,
            },
        });
        return this.findById(id, restaurantId, db);
    }
    async setCardCheckoutSessionId(id, restaurantId, cardCheckoutSessionId, db = prisma) {
        await db.order.updateMany({
            where: {
                id: Number(id),
                restaurantId,
            },
            data: {
                cardCheckoutSessionId,
            },
        });
        return this.findById(id, restaurantId, db);
    }
    async deleteById(id, restaurantId, db = prisma) {
        await db.order.deleteMany({
            where: {
                id: Number(id),
                restaurantId,
            },
        });
    }
    async deleteAllByRestaurant(restaurantId, db = prisma) {
        return db.order.deleteMany({
            where: {
                restaurantId,
            },
        });
    }
    async setPaymentConfirmationPin(id, restaurantId, paymentConfirmationPin, paymentConfirmationPinExpiresAt, db = prisma) {
        await db.order.updateMany({
            where: {
                id: Number(id),
                restaurantId,
            },
            data: {
                paymentConfirmationPin,
                paymentConfirmationPinExpiresAt,
            },
        });
        return this.findById(id, restaurantId, db);
    }
    async findById(id, restaurantId, db = prisma) {
        return db.order.findFirst({
            where: {
                id: Number(id),
                restaurantId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        whatsapp: true,
                    },
                },
                table: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
    }
    async findByPixPaymentId(pixPaymentId, restaurantId, db = prisma) {
        return db.order.findFirst({
            where: {
                pixPaymentId,
                ...(restaurantId
                    ? {
                        restaurantId,
                    }
                    : {}),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        whatsapp: true,
                    },
                },
                table: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
    }
    async findByCardCheckoutSessionId(cardCheckoutSessionId, restaurantId, db = prisma) {
        return db.order.findFirst({
            where: {
                cardCheckoutSessionId,
                ...(restaurantId
                    ? {
                        restaurantId,
                    }
                    : {}),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        whatsapp: true,
                    },
                },
                table: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
    }
    async findLatestByTable(tableId, restaurantId, db = prisma) {
        return db.order.findFirst({
            where: {
                tableId: Number(tableId),
                restaurantId: Number(restaurantId),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
                restaurant: {
                    select: {
                        id: true,
                        name: true,
                        whatsapp: true,
                    },
                },
                table: true,
                items: {
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
    async findByUserId(userId, restaurantId, db = prisma) {
        const normalizedRestaurantId = Number(restaurantId);
        const where = {
            userId: Number(userId),
        };
        if (Number.isFinite(normalizedRestaurantId) && normalizedRestaurantId > 0) {
            where.restaurantId = normalizedRestaurantId;
        }
        return db.order.findMany({
            where: {
                ...where,
                NOT: [
                    {
                        paymentMethod: PaymentMethod.PIX,
                        paid: false,
                        pixPaymentId: {
                            not: null,
                        },
                    },
                    {
                        paymentMethod: PaymentMethod.CARTAO,
                        paid: false,
                        cardCheckoutSessionId: {
                            not: null,
                        },
                    },
                ],
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                table: true,
                issueThread: {
                    select: {
                        orderId: true,
                        isResolved: true,
                        resolvedAt: true,
                        resolvedByName: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    }
}
export default new OrderRepository();
