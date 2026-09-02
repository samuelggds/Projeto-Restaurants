import {
  EmployeeCompensationBaseModel,
  EmployeeCompensationProrationMode,
  EmployeeCompensationVariableModel,
  EmployeeEarningDirection,
  EmployeeSettlementPaymentMethod,
  EmployeeSettlementStatus,
  EmployeeWorkEntryStatus,
} from '@prisma/client';
import { z } from 'zod';

export const positiveIdSchema = z.coerce.number().int().positive();
export const uuidSchema = z.string().uuid();
export const centsSchema = z.union([
  z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  z.string().trim().regex(/^\d+$/, 'Informe um valor inteiro em centavos.'),
]);
export const positiveCentsSchema = centsSchema.refine((value) => BigInt(value) > 0n, {
  message: 'O valor deve ser maior que zero.',
});
export const referenceMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Informe uma competência válida.');
export const optionalDateSchema = z.coerce.date().optional();

export const policySchema = z.object({
  baseModel: z.nativeEnum(EmployeeCompensationBaseModel),
  fixedMonthlyCents: centsSchema.optional().nullable(),
  hourlyRateCents: centsSchema.optional().nullable(),
  variableModel: z.nativeEnum(EmployeeCompensationVariableModel),
  variableBasisPoints: z.number().int().min(0).max(10_000).optional().nullable(),
  fixedPerTableCents: positiveCentsSchema.optional().nullable(),
  prorationMode: z
    .nativeEnum(EmployeeCompensationProrationMode)
    .default(EmployeeCompensationProrationMode.NONE),
  effectiveFrom: z.coerce.date(),
  effectiveUntil: z.coerce.date().optional().nullable(),
});

export const closePolicySchema = z.object({ effectiveUntil: z.coerce.date().optional() });

export const listPolicyQuerySchema = z.object({ employeeId: positiveIdSchema.optional() });
export const listEarningQuerySchema = z.object({
  employeeId: positiveIdSchema.optional(),
  from: optionalDateSchema,
  until: optionalDateSchema,
});

export const adjustmentSchema = z.object({
  employeeId: positiveIdSchema,
  type: z.enum(['BONUS', 'DEDUCTION', 'ADVANCE', 'CORRECTION']),
  direction: z.nativeEnum(EmployeeEarningDirection).optional(),
  amountCents: positiveCentsSchema,
  reason: z.string().trim().min(1).max(500),
  occurredAt: optionalDateSchema,
});

export const listWorkEntryQuerySchema = z.object({
  employeeId: positiveIdSchema.optional(),
  status: z.nativeEnum(EmployeeWorkEntryStatus).optional(),
});
export const createWorkEntrySchema = z.object({
  employeeId: positiveIdSchema,
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data no formato YYYY-MM-DD.'),
  minutesWorked: z.number().int().min(1).max(1_440),
});
export const reasonSchema = z.object({ reason: z.string().trim().min(1).max(500) });

export const generateSettlementSchema = z.object({
  employeeId: positiveIdSchema,
  referenceMonth: referenceMonthSchema,
});
export const listSettlementQuerySchema = z.object({
  employeeId: positiveIdSchema.optional(),
  status: z.nativeEnum(EmployeeSettlementStatus).optional(),
});
export const registerPaymentSchema = z.object({
  amountCents: positiveCentsSchema,
  method: z.nativeEnum(EmployeeSettlementPaymentMethod),
  reference: z.string().trim().max(191).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});
export const assignWaiterSchema = z.object({
  waiterId: positiveIdSchema,
  reason: z.string().trim().max(500).optional(),
});
