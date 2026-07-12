import restaurantRepository from "../repositories/RestaurantRepository.js";
import bcrypt from "bcrypt";
import userRepository from "../../auth/repositories/UserRepository.js";
import subscriptionRepository from "../../subscription/repositories/SubscriptionRepository.js";
import { PlanType, SubscriptionStatus, UserRole } from "@prisma/client";
import prisma from "../../../config/prisma.js";
import { createRestaurantSchema } from "../../../validators/RestaurantValidator.js";
function requireDefined(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message);
    }
    return value;
}
class CreateRestaurantService {
    async execute({ restaurant, admin }) {
        const parsedPayloadResult = createRestaurantSchema.safeParse({
            restaurant,
            admin,
        });
        if (!parsedPayloadResult.success) {
            const firstIssue = parsedPayloadResult.error.issues[0];
            throw new Error(firstIssue?.message || "Dados inválidos para cadastro.");
        }
        const parsedPayload = parsedPayloadResult.data;
        const parsedRestaurant = parsedPayload.restaurant;
        const parsedAdmin = parsedPayload.admin;
        const restaurantExists = await restaurantRepository.findByEmail(parsedRestaurant.email);
        if (restaurantExists) {
            throw new Error("Já existe um restaurante com esse e-mail.");
        }
        const slugExists = await restaurantRepository.findBySlug(parsedRestaurant.slug);
        if (slugExists) {
            throw new Error("Esse slug já existe. Escolha outro.");
        }
        const userExists = await userRepository.findByEmail(parsedAdmin.email);
        if (userExists) {
            throw new Error("Já existe um admin com esse e-mail.");
        }
        return prisma.$transaction(async (tx) => {
            const requiredName = requireDefined(parsedRestaurant.name, "Nome do restaurante é obrigatório.");
            const requiredSlug = requireDefined(parsedRestaurant.slug, "Slug do restaurante é obrigatório.");
            const requiredEmail = requireDefined(parsedRestaurant.email, "Email do restaurante é obrigatório.");
            const restaurantCreateData = {
                ...parsedRestaurant,
                name: requiredName,
                slug: requiredSlug,
                email: requiredEmail,
            };
            const createdRestaurant = await restaurantRepository.create(restaurantCreateData, tx);
            const passwordHash = await bcrypt.hash(parsedAdmin.password, 10);
            const createdAdmin = await userRepository.create({
                name: parsedAdmin.name,
                email: parsedAdmin.email,
                password: passwordHash,
                role: UserRole.ADMIN,
                active: true,
                mustChangePassword: true,
                restaurantId: createdRestaurant.id,
            }, tx);
            const TRIAL_DAYS = 30;
            const today = new Date();
            const trialEndsAt = new Date(today);
            trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
            await subscriptionRepository.create({
                restaurantId: createdRestaurant.id,
                plan: PlanType.BASICO,
                status: SubscriptionStatus.TESTE,
                trialEndsAt,
                currentPeriodStart: today,
                currentPeriodEnd: trialEndsAt,
            }, tx);
            return {
                restaurant: createdRestaurant,
                admin: {
                    id: createdAdmin.id,
                    name: createdAdmin.name,
                    email: createdAdmin.email,
                },
            };
        });
    }
}
export default new CreateRestaurantService();
