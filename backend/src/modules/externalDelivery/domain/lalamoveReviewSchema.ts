import { z } from 'zod';

export const LALAMOVE_PROVIDER = 'LALAMOVE' as const;

export const lalamoveReviewStatusSchema = z.enum([
  'REQUESTED',
  'IN_REVIEW',
  'ACTION_REQUIRED',
  'SUSPENDED',
]);

export const lalamoveReviewReasonSchema = z.enum([
  'PROVIDER_APPROVAL',
  'MERCHANT_ACCOUNT',
  'WALLET_BALANCE',
  'SERVICE_COVERAGE',
  'THERMAL_BAG',
  'OTHER',
]);

export const lalamoveReviewUpdateSchema = z
  .object({
    status: lalamoveReviewStatusSchema,
    expectedStatus: lalamoveReviewStatusSchema,
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    reasonCode: lalamoveReviewReasonSchema.nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === value.expectedStatus) {
      ctx.addIssue({
        code: 'custom',
        path: ['status'],
        message: 'Escolha um novo status para continuar.',
      });
    }
    if (
      (value.status === 'ACTION_REQUIRED' || value.status === 'SUSPENDED') &&
      !value.reasonCode
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['reasonCode'],
        message: 'Selecione o motivo usando uma das opções permitidas.',
      });
    }
    if (value.status === 'IN_REVIEW' && value.reasonCode !== null) {
      ctx.addIssue({
        code: 'custom',
        path: ['reasonCode'],
        message: 'Em análise não deve conservar um motivo anterior.',
      });
    }
  });

export type LalamoveReviewStatus = z.infer<typeof lalamoveReviewStatusSchema>;
export type LalamoveReviewReason = z.infer<typeof lalamoveReviewReasonSchema>;

const allowed: Record<LalamoveReviewStatus, LalamoveReviewStatus[]> = {
  REQUESTED: ['IN_REVIEW', 'ACTION_REQUIRED', 'SUSPENDED'],
  IN_REVIEW: ['ACTION_REQUIRED', 'SUSPENDED'],
  ACTION_REQUIRED: ['IN_REVIEW', 'SUSPENDED'],
  SUSPENDED: ['IN_REVIEW'],
};

/** Reviewing a request never authorizes provider API calls or wallet charges. */
export function assertLalamoveReviewTransition(
  from: LalamoveReviewStatus,
  to: LalamoveReviewStatus,
): void {
  if (!allowed[from]?.includes(to)) {
    throw new Error('Mudança de status da Lalamove não permitida.');
  }
}
