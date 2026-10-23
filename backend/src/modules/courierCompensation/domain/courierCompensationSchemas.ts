import {
  CourierCompensationModel,
  CourierSettlementPaymentMethod,
  CourierSettlementStatus,
} from '@prisma/client';
import { z } from 'zod';

const money = z.union([
  z.number().finite().nonnegative().max(1_000_000),
  z.string().regex(/^\d+(?:[.,]\d{1,2})?$/),
]);

const range = z.object({
  maxDistanceMeters: z.coerce.number().int().positive().max(2_000_000),
  amount: money,
});

export const compensationPolicySchema = z.object({
  model: z.nativeEnum(CourierCompensationModel),
  fixedAmount: money.optional(),
  baseAmount: money.optional(),
  includedDistanceMeters: z.coerce.number().int().nonnegative().max(2_000_000).optional(),
  extraPerKmAmount: money.optional(),
  ranges: z.array(range).max(50).optional(),
});

export const updateDefaultCompensationSchema = compensationPolicySchema.extend({
  timezone: z.string().trim().min(1).max(100),
});

export const createSettlementSchema = z.object({
  courierId: z.coerce.number().int().positive(),
  orderIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
  paymentMethod: z.nativeEnum(CourierSettlementPaymentMethod).optional(),
  adminNote: z.string().trim().max(500).optional().nullable(),
  evidenceUrl: z.string().url().max(1000).optional().nullable(),
});

export const disputeSettlementSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const settlementStatusSchema = z.nativeEnum(CourierSettlementStatus);
export const uuidSchema = z.string().uuid();
export const positiveIdSchema = z.coerce.number().int().positive();
