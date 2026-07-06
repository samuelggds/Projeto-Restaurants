import { z } from "zod";
import { OrderType, PaymentMethod } from "@prisma/client";

export const createOrderSchema = z.object({
  restaurantId: z.number().int().positive().optional(),

  customerName: z.string().trim().min(2).optional(),

  customerCpf: z.string().trim().min(11).optional(),

  type: z.nativeEnum(OrderType),

  paymentMethod: z.nativeEnum(PaymentMethod).optional(),

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
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        observation: z.string().trim().optional(),
      }),
    )
    .min(1, "O pedido deve conter pelo menos um item."),
});
