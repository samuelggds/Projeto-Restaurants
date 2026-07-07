import restaurantRepository from "../repositories/RestaurantRepository.js";
import bcrypt from "bcrypt";
import userRepository from "../../auth/repositories/UserRepository.js";
import subscriptionRepository from "../../subscription/repositories/SubscriptionRepository.js";
import { PlanType, SubscriptionStatus, UserRole } from "@prisma/client";
import prisma from "../../../config/prisma.js";
import { createRestaurantSchema } from "../../../validators/RestaurantValidator.js";
import { z } from "zod";

type CreateRestaurantPayload = z.infer<typeof createRestaurantSchema>;

class CreateRestaurantService {
  async execute({ restaurant, admin }: CreateRestaurantPayload) {
    createRestaurantSchema.parse({ restaurant, admin });

    const restaurantExists = await restaurantRepository.findByEmail(
      restaurant.email,
    );

    if (restaurantExists) {
      throw new Error("Já existe um restaurante com esse email!");
    }

    const slugExists = await restaurantRepository.findBySlug(restaurant.slug);

    if (slugExists) {
      throw new Error("Esse slug já está sendo utilizado!");
    }

    const userExists = await userRepository.findByEmail(admin.email);

    if (userExists) {
      throw new Error("Já existe um usuário com esse email!");
    }

    return prisma.$transaction(async (tx) => {
      const createdRestaurant = await restaurantRepository.create(
        {
          ...restaurant,
        },
        tx,
      );

      const passwordHash = await bcrypt.hash(admin.password, 10);

      const createdAdmin = await userRepository.create(
        {
          name: admin.name,
          email: admin.email,
          password: passwordHash,
          role: UserRole.ADMIN,
          active: true,
          restaurantId: createdRestaurant.id,
        },
        tx,
      );

      const TRIAL_DAYS = 30;

      const today = new Date();

      const trialEndsAt = new Date(today);
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

      await subscriptionRepository.create(
        {
          restaurantId: createdRestaurant.id,
          plan: PlanType.BASICO,
          status: SubscriptionStatus.TESTE,
          trialEndsAt,
          currentPeriodStart: today,
          currentPeriodEnd: trialEndsAt,
        },
        tx,
      );

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
