import { z } from "zod";

export const createRestaurantSchema = z.object({
  restaurant: z.object({
    name: z.string().min(1, "Nome obrigatório!"),
    slug: z.string().min(1, "Slug obrigatório!"),
    email: z.string().email("Email inválido!"),

    phone: z.string().optional(),
    whatsapp: z.string().optional(),

    cnpj: z.string().optional(),

    logo: z.string().optional(),
    coverImage: z.string().optional(),
    description: z.string().optional(),

    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),

    openingHours: z.string().optional(),
  }),

  admin: z.object({
    name: z.string().min(1, "Nome do admin obrigatório!"),
    email: z.string().email("Email inválido!"),
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres!"),
  }),
});
