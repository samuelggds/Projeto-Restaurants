import { z } from 'zod';
import { collectStrongPasswordErrors } from '../../auth/security/passwordPolicy.js';

const normalizedText = (minimum: number, maximum: number, label: string) =>
  z
    .string()
    .trim()
    .min(minimum, `${label} deve ter no mínimo ${minimum} caracteres.`)
    .max(maximum, `${label} deve ter no máximo ${maximum} caracteres.`);

const isoDateTime = z
  .string()
  .datetime({ offset: true, message: 'Informe uma data e hora ISO válida.' });

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export const platformSettingsUpdateSchema = z
  .object({
    version: z.number().int().positive(),
    platformName: normalizedText(2, 80, 'Nome da plataforma'),
    platformDomain: normalizedText(3, 255, 'Domínio').regex(
      /^(?:https?:\/\/)?(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})(?::\d{1,5})?(?:\/.*)?$/iu,
      'Domínio inválido.',
    ),
    supportEmail: z.string().trim().toLowerCase().email('E-mail de suporte inválido.'),
    primaryColor: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^#[0-9A-F]{6}$/u, 'A cor principal deve estar no formato hexadecimal #RRGGBB.'),
    locale: z
      .string()
      .trim()
      .regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/u, 'Locale inválido.'),
    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/u, 'Moeda deve usar o código ISO de três letras.'),
    timezone: z.string().trim().refine(isValidTimezone, 'Fuso horário inválido.'),
    dateFormat: z.enum(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']),
    allowRestaurantSignup: z.boolean(),
    requireManualApproval: z.boolean(),
    defaultTrialDays: z.number().int().min(0).max(90),
    auditRetentionDays: z.number().int().min(90).max(3650),
    maintenanceMode: z.boolean(),
    maintenanceMessage: normalizedText(3, 500, 'Mensagem de manutenção'),
  })
  .strict();

export const platformPlanUpdateSchema = z
  .object({
    version: z.number().int().positive(),
    name: normalizedText(2, 60, 'Nome do plano').optional(),
    description: normalizedText(10, 500, 'Descrição').optional(),
    monthlyFee: z.number().finite().min(0).max(100_000).optional(),
    trialDays: z.number().int().min(0).max(90).optional(),
    features: z
      .array(normalizedText(2, 120, 'Funcionalidade'))
      .max(30)
      .transform((items) => [...new Set(items)])
      .optional(),
    featured: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).some((key) => key !== 'version'), {
    message: 'Informe ao menos uma alteração para o plano.',
  });

export const restaurantAccessUpdateSchema = z
  .object({
    active: z.boolean(),
    reason: normalizedText(8, 500, 'Motivo'),
  })
  .strict();

export const restaurantSubscriptionUpdateSchema = z
  .object({
    planCode: z.enum(['BASICO', 'PREMIUM']).optional(),
    status: z.enum(['TESTE', 'ATIVA', 'EXPIRADA', 'CANCELADA']).optional(),
    trialEndsAt: isoDateTime.nullable().optional(),
    nextBillingAt: isoDateTime.nullable().optional(),
    reason: normalizedText(8, 500, 'Motivo'),
  })
  .strict()
  .refine(
    (value) =>
      value.planCode !== undefined ||
      value.status !== undefined ||
      value.trialEndsAt !== undefined ||
      value.nextBillingAt !== undefined,
    { message: 'Informe ao menos uma alteração para a assinatura.' },
  );

export const createRestaurantAdministratorSchema = z
  .object({
    name: normalizedText(2, 120, 'Nome'),
    email: z.string().trim().toLowerCase().email('E-mail inválido.'),
    password: z.string().superRefine((password, context) => {
      const errors = collectStrongPasswordErrors(password);
      if (errors.length > 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `A senha ${errors.join('; ')}.`,
        });
      }
    }),
    passwordConfirmation: z.string(),
  })
  .strict()
  .refine((value) => value.password === value.passwordConfirmation, {
    path: ['passwordConfirmation'],
    message: 'A confirmação da senha não confere.',
  });

export const administratorAccessUpdateSchema = z
  .object({
    active: z.boolean(),
    reason: normalizedText(8, 500, 'Motivo'),
  })
  .strict();

export const supportMessageSchema = z
  .object({
    message: normalizedText(2, 1200, 'Mensagem'),
  })
  .strict();

export type PlatformSettingsUpdateInput = z.infer<typeof platformSettingsUpdateSchema>;
export type PlatformPlanUpdateInput = z.infer<typeof platformPlanUpdateSchema>;
export type RestaurantAccessUpdateInput = z.infer<typeof restaurantAccessUpdateSchema>;
export type RestaurantSubscriptionUpdateInput = z.infer<
  typeof restaurantSubscriptionUpdateSchema
>;
export type CreateRestaurantAdministratorInput = z.infer<
  typeof createRestaurantAdministratorSchema
>;
export type AdministratorAccessUpdateInput = z.infer<
  typeof administratorAccessUpdateSchema
>;
export type SupportMessageInput = z.infer<typeof supportMessageSchema>;

