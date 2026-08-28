import restaurantRepository from '../repositories/RestaurantRepository.js';
import bcrypt from 'bcrypt';
import userRepository from '../../auth/repositories/UserRepository.js';
import subscriptionRepository from '../../subscription/repositories/SubscriptionRepository.js';
import { PlanType, SubscriptionStatus, UserRole } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { createRestaurantSchema } from '../../../validators/RestaurantValidator.js';
import { z } from 'zod';
import { collectStrongPasswordErrors } from '../../auth/security/passwordPolicy.js';
import platformPlanCatalogService from '../../billing/services/PlatformPlanCatalogService.js';
import { addDays } from '../../billing/utils/dateUtils.js';

type CreateRestaurantPayload = z.infer<typeof createRestaurantSchema>;

export type CreateRestaurantAuditActor = {
  userId: number;
  ipAddress?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
};

type CreateRestaurantCommand = CreateRestaurantPayload & {
  actor?: CreateRestaurantAuditActor;
};

function requireDefined<T>(value: T | null | undefined, message: string): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }

  return value as NonNullable<T>;
}

function isValidAuditActor(
  actor: CreateRestaurantAuditActor | undefined,
): actor is CreateRestaurantAuditActor {
  return Boolean(actor && Number.isSafeInteger(actor.userId) && actor.userId > 0);
}

function validateTemporaryAdministratorPassword(password: string) {
  const errors = collectStrongPasswordErrors(password);
  if (errors.length > 0) {
    throw new Error(`A senha temporária ${errors.join('; ')}.`);
  }
}

export class CreateRestaurantService {
  async execute({ restaurant, admin, plan, actor }: CreateRestaurantCommand) {
    const parsedPayloadResult = createRestaurantSchema.safeParse({
      restaurant,
      admin,
      plan,
    });

    if (!parsedPayloadResult.success) {
      const firstIssue = parsedPayloadResult.error.issues[0];
      throw new Error(firstIssue?.message || 'Dados inválidos para cadastro.');
    }

    const parsedPayload = parsedPayloadResult.data;
    const parsedRestaurant = parsedPayload.restaurant;
    const parsedAdmin = parsedPayload.admin;

    // A senha fornecida é temporária porque o administrador deverá trocá-la
    // no primeiro acesso, mas ainda precisa cumprir a política forte desde já.
    validateTemporaryAdministratorPassword(parsedAdmin.password);

    const restaurantExists = await restaurantRepository.findByEmail(parsedRestaurant.email);

    if (restaurantExists) {
      throw new Error('Já existe um restaurante com esse e-mail.');
    }

    const slugExists = await restaurantRepository.findBySlug(parsedRestaurant.slug);

    if (slugExists) {
      throw new Error('Esse slug já existe. Escolha outro.');
    }

    const userExists = await userRepository.findByEmail(parsedAdmin.email);

    if (userExists) {
      throw new Error('Já existe um admin com esse e-mail.');
    }

    // O hash é calculado antes da transação para não manter uma conexão e locks
    // do banco ocupados durante uma operação intencionalmente custosa.
    const passwordHash = await bcrypt.hash(parsedAdmin.password, 12);

    return prisma.$transaction(async (tx) => {
      const selectedPlan = await platformPlanCatalogService.getByCode(
        parsedPayload.plan as PlanType,
        {
          activeOnly: true,
          db: tx,
        },
      );
      const requiredName = requireDefined(
        parsedRestaurant.name,
        'Nome do restaurante é obrigatório.',
      );
      const requiredSlug = requireDefined(
        parsedRestaurant.slug,
        'Slug do restaurante é obrigatório.',
      );
      const requiredEmail = requireDefined(
        parsedRestaurant.email,
        'Email do restaurante é obrigatório.',
      );

      const restaurantCreateData: Prisma.RestaurantUncheckedCreateInput = {
        ...parsedRestaurant,
        name: requiredName,
        slug: requiredSlug,
        email: requiredEmail,
      };

      const createdRestaurant = await restaurantRepository.create(restaurantCreateData, tx);

      const createdAdmin = await userRepository.create(
        {
          name: parsedAdmin.name,
          email: parsedAdmin.email,
          password: passwordHash,
          role: UserRole.ADMIN,
          active: true,
          mustChangePassword: true,
          restaurantId: createdRestaurant.id,
        },
        tx,
      );

      const today = new Date();
      const trialEndsAt = addDays(today, selectedPlan.trialDays);

      await subscriptionRepository.create(
        {
          restaurantId: createdRestaurant.id,
          plan: parsedPayload.plan as PlanType,
          status: SubscriptionStatus.TESTE,
          trialEndsAt,
          currentPeriodStart: today,
          currentPeriodEnd: trialEndsAt,
        },
        tx,
      );

      // O log participa da mesma transação: se ele falhar, restaurante,
      // administrador e assinatura também são revertidos. Nenhum ator é
      // fabricado quando o caller não fornece um contexto autenticado válido.
      if (isValidAuditActor(actor)) {
        const persistedActor = await tx.user.findUnique({
          where: { id: actor.userId },
          select: { id: true, name: true, role: true },
        });

        if (persistedActor) {
          await tx.auditLog.create({
            data: {
              userId: persistedActor.id,
              userName: persistedActor.name,
              userRole: persistedActor.role,
              restaurantId: createdRestaurant.id,
              restaurantName: createdRestaurant.name,
              action: 'RESTAURANT_CREATED',
              resource: `Restaurant:${createdRestaurant.id}`,
              ipAddress: actor.ipAddress ?? null,
              requestId: actor.requestId ?? null,
              userAgent: actor.userAgent ?? null,
              metadata: {
                plan: selectedPlan.plan,
                trialDays: selectedPlan.trialDays,
                adminUserId: createdAdmin.id,
              },
            },
          });
        }
      }

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
