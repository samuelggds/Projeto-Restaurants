import prisma from "../../../config/prisma.js";
import orderRepository from "../repositories/OrderRepository.js";
import productRepository from "../../products/repositories/ProductRepository.js";
import { io } from "../../../server.js";
import { createOrderSchema } from "../../../validators/OrderValidator.js";
import tableSessionRepository from "../../tableSession/repositories/TableSessionRepository.js";
import orderPixPaymentService from "./OrderPixPaymentService.js";
import { PaymentMethod, TableSessionStatus, OrderType, } from "@prisma/client";
import { notifyCustomerPaymentConfirmed } from "../../../services/customerNotifier.js";
const SUPPORTED_PAYMENT_METHODS = new Set([
    PaymentMethod.PIX,
    PaymentMethod.CARTAO,
]);
class CreateOrderService {
    formatCpf(value) {
        const digits = String(value || "").replace(/\D/g, "");
        if (digits.length !== 11) {
            return null;
        }
        return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    }
    normalizePhone(value) {
        const digits = String(value || "").replace(/\D/g, "");
        if (!digits) {
            return null;
        }
        if (/^55\d{10,11}$/.test(digits)) {
            return `+${digits}`;
        }
        if (/^\d{10,11}$/.test(digits)) {
            return `+55${digits}`;
        }
        return null;
    }
    async resolveOrderUser({ tx, userId, restaurantId, customerName, customerCpf, customerPhone, }) {
        const normalizedPhone = this.normalizePhone(customerPhone);
        if (userId) {
            if (normalizedPhone) {
                await tx.user.update({
                    where: {
                        id: Number(userId),
                    },
                    data: {
                        phone: normalizedPhone,
                    },
                });
            }
            return Number(userId);
        }
        const normalizedName = String(customerName || "").trim();
        const cpfDigits = String(customerCpf || "").replace(/\D/g, "");
        if (normalizedName.length < 2) {
            throw new Error("Informe o nome para finalizar o pedido.");
        }
        if (cpfDigits.length !== 11) {
            throw new Error("Informe um CPF vÃ¡lido com 11 dÃ­gitos.");
        }
        const guestEmail = `guest.${restaurantId}.${cpfDigits}@pecaja.local`;
        const guestPassword = `guest-${restaurantId}-${cpfDigits}`;
        const guestUser = await tx.user.upsert({
            where: {
                email: guestEmail,
            },
            update: {
                name: normalizedName,
                active: true,
                ...(normalizedPhone
                    ? {
                        phone: normalizedPhone,
                    }
                    : {}),
            },
            create: {
                name: normalizedName,
                email: guestEmail,
                password: guestPassword,
                role: "CLIENTE",
                active: true,
                phone: normalizedPhone,
                restaurantId,
            },
            select: {
                id: true,
            },
        });
        return Number(guestUser.id);
    }
    async resolvePaymentState({ paymentMethod, paid, pixPaymentId, restaurantId, }) {
        const normalizedPaymentMethod = String(paymentMethod || "").toUpperCase();
        const normalizedPixPaymentId = String(pixPaymentId || "").trim();
        const requestedAsPaid = paid === true;
        if (!requestedAsPaid) {
            return {
                normalizedPaymentMethod,
                normalizedPixPaymentId,
                shouldMarkAsPaid: false,
                paidAt: null,
            };
        }
        if (normalizedPaymentMethod === PaymentMethod.PIX) {
            if (normalizedPixPaymentId &&
                !normalizedPixPaymentId.startsWith("manual:")) {
                const paymentStatus = await orderPixPaymentService.ensurePaymentApproved({
                    paymentId: normalizedPixPaymentId,
                    restaurantId,
                });
                if (!paymentStatus.sameRestaurant) {
                    throw new Error("O pagamento PIX informado nao pertence a este restaurante.");
                }
                return {
                    normalizedPaymentMethod,
                    normalizedPixPaymentId,
                    shouldMarkAsPaid: true,
                    paidAt: new Date(),
                };
            }
            throw new Error("Pagamento PIX ainda nao foi confirmado pelo provedor.");
        }
        if (normalizedPaymentMethod === PaymentMethod.CARTAO) {
            return {
                normalizedPaymentMethod,
                normalizedPixPaymentId,
                shouldMarkAsPaid: true,
                paidAt: new Date(),
            };
        }
        return {
            normalizedPaymentMethod,
            normalizedPixPaymentId,
            shouldMarkAsPaid: false,
            paidAt: null,
        };
    }
    async execute({ userId, restaurantId, userRestaurantId, tableSessionId, tableSessionTableId, deferRealtimeUntilPaid, type, paymentMethod, payOnDelivery, payOnDeliveryMethod, paid, pixPaymentId, paymentProof, observation, customerName, customerCpf, customerPhone, tableId, items, address, number, district, city, state, zipCode, paymentProofImage, complement, }) {
        const resolvedRestaurantId = Number(restaurantId) || Number(userRestaurantId) || null;
        if (!resolvedRestaurantId) {
            throw new Error("Restaurante nÃ£o informado para o pedido");
        }
        const shouldPayOnDelivery = payOnDelivery === true;
        const effectivePaymentMethod = shouldPayOnDelivery
            ? payOnDeliveryMethod || paymentMethod
            : paymentMethod;
        if (shouldPayOnDelivery && type !== OrderType.DELIVERY) {
            throw new Error("Pagar na entrega só é permitido para pedidos de delivery.");
        }
        if (shouldPayOnDelivery && !effectivePaymentMethod) {
            throw new Error("Informe o método de pagamento para pedidos com pagar na entrega.");
        }
        const normalizedEffectivePaymentMethod = String(effectivePaymentMethod || "")
            .trim()
            .toUpperCase();
        if (!SUPPORTED_PAYMENT_METHODS.has(normalizedEffectivePaymentMethod)) {
            throw new Error("Método de pagamento inválido. Utilize apenas PIX ou CARTAO.");
        }
        if (String(effectivePaymentMethod || "").toUpperCase() ===
            PaymentMethod.PIX &&
            (String(paymentProof || "").trim() ||
                String(paymentProofImage || "").trim())) {
            throw new Error("Nao e permitido enviar comprovante manual para PIX. O pedido sera confirmado automaticamente pelo provedor.");
        }
        createOrderSchema.parse({
            restaurantId: resolvedRestaurantId,
            customerName,
            customerCpf,
            customerPhone,
            type,
            paymentMethod: effectivePaymentMethod,
            payOnDelivery: shouldPayOnDelivery,
            payOnDeliveryMethod: shouldPayOnDelivery
                ? effectivePaymentMethod
                : undefined,
            paid,
            pixPaymentId,
            paymentProof,
            observation,
            tableId,
            items,
            address,
            number,
            district,
            city,
            state,
            zipCode,
            complement,
            paymentProofImage,
        });
        const { normalizedPaymentMethod, normalizedPixPaymentId, shouldMarkAsPaid, paidAt, } = await this.resolvePaymentState({
            paymentMethod: effectivePaymentMethod,
            paid: shouldPayOnDelivery ? false : paid,
            pixPaymentId,
            restaurantId: resolvedRestaurantId,
        });
        if (type === "MESA") {
            if (!tableSessionId) {
                throw new Error("SessÃ£o da mesa nÃ£o informada. Valide o PIN da mesa para continuar.");
            }
            const session = await tableSessionRepository.findById(tableSessionId);
            if (!session || session.status !== TableSessionStatus.OPEN) {
                throw new Error("Essa mesa estÃ¡ fechada. Gere um novo PIN com a equipe para continuar.");
            }
            if (Number(tableId || 0) && Number(tableId) !== Number(session.tableId)) {
                throw new Error("Mesa do pedido nÃ£o confere com a sessÃ£o validada.");
            }
            if (Number(tableSessionTableId || 0) > 0 &&
                Number(tableSessionTableId) !== Number(session.tableId)) {
                throw new Error("SessÃ£o da mesa invÃ¡lida para este pedido.");
            }
            tableId = Number(session.tableId);
        }
        if (type === "DELIVERY") {
            const requiredAddressFields = [address, number, district, city, state]
                .map((value) => String(value || "").trim())
                .filter(Boolean);
            if (requiredAddressFields.length < 5) {
                throw new Error("Informe o endereÃ§o completo para pedidos de delivery.");
            }
            const normalizedCustomerPhone = this.normalizePhone(customerPhone);
            if (!normalizedCustomerPhone && userId) {
                const existingUser = await prisma.user.findUnique({
                    where: {
                        id: Number(userId),
                    },
                    select: {
                        phone: true,
                    },
                });
                const normalizedExistingPhone = this.normalizePhone(existingUser?.phone);
                if (!normalizedExistingPhone) {
                    throw new Error("Informe um celular/WhatsApp válido para pedidos de delivery.");
                }
            }
            if (!normalizedCustomerPhone && !userId) {
                throw new Error("Informe um celular/WhatsApp válido para pedidos de delivery.");
            }
        }
        const createdOrder = await prisma.$transaction(async (tx) => {
            const resolvedUserId = await this.resolveOrderUser({
                tx,
                userId,
                restaurantId: resolvedRestaurantId,
                customerName,
                customerCpf,
                customerPhone,
            });
            const products = await Promise.all(items.map((item) => productRepository.findById(item.productId, resolvedRestaurantId, tx)));
            products.forEach((product, index) => {
                const item = items[index];
                if (!product) {
                    throw new Error(`Produto nÃ£o encontrado: ${items[index].productId}`);
                }
                if (product.active === false) {
                    throw new Error(`Produto indisponÃ­vel: ${product.name}`);
                }
                const quantity = Number(item.quantity || 0);
                if (!Number.isInteger(quantity) || quantity <= 0) {
                    throw new Error(`Quantidade invÃ¡lida para ${product.name}.`);
                }
                const stockValue = product.stock === null || product.stock === undefined
                    ? null
                    : Number(product.stock);
                if (Number.isInteger(stockValue) &&
                    stockValue >= 0 &&
                    quantity > stockValue) {
                    throw new Error(`Estoque insuficiente para ${product.name}. DisponÃ­vel: ${stockValue}.`);
                }
            });
            const orderItems = items.map((item, index) => {
                const product = products[index];
                return {
                    productId: product.id,
                    quantity: item.quantity,
                    price: Number(product.price),
                    observation: item.observation,
                };
            });
            const total = orderItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
            const formattedCpf = this.formatCpf(customerCpf);
            const guestSummary = !userId && customerName
                ? `Cliente: ${String(customerName).trim()}${formattedCpf ? ` | CPF: ${formattedCpf}` : ""}`
                : "";
            const mergedObservation = [guestSummary, observation]
                .map((item) => String(item || "").trim())
                .filter(Boolean)
                .join(" | ");
            const normalizedTableId = tableId === null || tableId === undefined || tableId === ""
                ? null
                : Number(tableId);
            const order = await orderRepository.create({
                total,
                systemFee: 0,
                type,
                paymentMethod: effectivePaymentMethod,
                payOnDelivery: shouldPayOnDelivery,
                payOnDeliveryMethod: shouldPayOnDelivery
                    ? effectivePaymentMethod
                    : null,
                paid: shouldMarkAsPaid,
                pixPaymentId: normalizedPixPaymentId || null,
                paidAt,
                paymentProof: null,
                paymentProofImage: null,
                observation: mergedObservation || null,
                userId: resolvedUserId,
                restaurantId: resolvedRestaurantId,
                tableId: normalizedTableId,
                address,
                number,
                district,
                city,
                state,
                zipCode,
                complement,
            }, tx);
            await tx.orderItem.createMany({
                data: orderItems.map((item) => ({
                    ...item,
                    orderId: order.id,
                })),
            });
            await Promise.all(orderItems.map(async (item, index) => {
                const product = products[index];
                const stockValue = product.stock === null || product.stock === undefined
                    ? null
                    : Number(product.stock);
                if (!Number.isInteger(stockValue) || stockValue < 0) {
                    return;
                }
                const nextStock = Math.max(stockValue - Number(item.quantity || 0), 0);
                await tx.product.update({
                    where: {
                        id: Number(product.id),
                    },
                    data: {
                        stock: nextStock,
                        active: nextStock === 0 ? false : Boolean(product.active),
                    },
                });
            }));
            return orderRepository.findById(order.id, resolvedRestaurantId, tx);
        });
        const isUnpaidDelivery = type === OrderType.DELIVERY && shouldMarkAsPaid !== true;
        const isUnpaidDigitalPayment = shouldMarkAsPaid !== true &&
            (normalizedPaymentMethod === PaymentMethod.PIX ||
                normalizedPaymentMethod === PaymentMethod.CARTAO);
        const shouldDeferRealtimeUntilPaid = deferRealtimeUntilPaid === true ||
            isUnpaidDelivery ||
            isUnpaidDigitalPayment;
        if (!shouldDeferRealtimeUntilPaid) {
            io.to(`restaurant:${createdOrder.restaurantId}`).emit("new-order", createdOrder);
            io.to(`user:${createdOrder.userId}`).emit("new-order", createdOrder);
        }
        if (shouldMarkAsPaid) {
            io.to(`restaurant:${createdOrder.restaurantId}`).emit("order:payment-confirmed", {
                orderId: createdOrder.id,
                paymentMethod: normalizedPaymentMethod,
                paid: true,
                status: createdOrder.status,
            });
            io.to(`user:${createdOrder.userId}`).emit("payment-confirmed", {
                orderId: createdOrder.id,
                paymentMethod: normalizedPaymentMethod,
                paid: true,
                status: createdOrder.status,
            });
            notifyCustomerPaymentConfirmed({
                customerPhone: createdOrder?.user?.phone || customerPhone,
                customerName: createdOrder?.user?.name || customerName,
                restaurantName: createdOrder?.restaurant?.name,
                restaurantWhatsapp: createdOrder?.restaurant?.whatsapp,
                orderId: createdOrder?.id,
                total: createdOrder?.total,
                paymentMethod: normalizedPaymentMethod,
            }).catch((error) => {
                console.error("[CUSTOMER_NOTIFICATION_UNHANDLED]", error instanceof Error ? error.message : String(error));
            });
        }
        return createdOrder;
    }
}
export default new CreateOrderService();
