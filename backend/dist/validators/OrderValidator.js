import { z } from "zod";
import { OrderType, PaymentMethod } from "@prisma/client";
const supportedPaymentMethodSchema = z.enum([
    PaymentMethod.PIX,
    PaymentMethod.CARTAO,
]);
export const createOrderSchema = z
    .object({
    restaurantId: z.number().int().positive().optional(),
    customerName: z.string().trim().min(2).optional(),
    customerCpf: z.string().trim().min(11).optional(),
    customerPhone: z.string().trim().min(10).optional(),
    type: z.nativeEnum(OrderType),
    paymentMethod: supportedPaymentMethodSchema.optional(),
    payOnDelivery: z.boolean().optional(),
    payOnDeliveryMethod: supportedPaymentMethodSchema.optional(),
    paid: z.boolean().optional(),
    pixPaymentId: z.string().trim().min(3).optional(),
    observation: z.string().trim().optional(),
    tableId: z.number().int().positive().optional(),
    address: z.string().trim().optional(),
    number: z.string().trim().optional(),
    district: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    zipCode: z.string().trim().optional(),
    complement: z.string().trim().optional(),
    items: z
        .array(z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        observation: z.string().trim().optional(),
    }))
        .min(1, "O pedido deve conter pelo menos um item."),
})
    .superRefine((data, ctx) => {
    if (data.type !== OrderType.DELIVERY) {
        return;
    }
    const phoneDigits = String(data.customerPhone || "").replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["customerPhone"],
            message: "Informe um celular/WhatsApp válido para pedidos de delivery.",
        });
    }
    if (data.payOnDelivery === true) {
        if (data.type !== OrderType.DELIVERY) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["type"],
                message: "Pagar na entrega só é permitido para pedidos de delivery.",
            });
        }
        if (!data.payOnDeliveryMethod) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["payOnDeliveryMethod"],
                message: "Informe o método de pagamento para pagar na entrega.",
            });
        }
    }
});
