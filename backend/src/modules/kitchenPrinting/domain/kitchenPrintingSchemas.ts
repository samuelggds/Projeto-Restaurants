import { z } from 'zod';

export const updatePrinterSettingsSchema = z
  .object({
    enabled: z.boolean(),
    autoPrintEnabled: z.boolean(),
    autoPrintTrigger: z.enum(['NEW_ORDER', 'PAYMENT_CONFIRMED']),
    paperWidth: z.enum(['MM58', 'MM80']),
    copies: z.number().int().min(1).max(5),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Informe ao menos uma configuração.');

export const issuePrinterAgentCredentialSchema = z
  .object({
    devicePublicId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(80).optional(),
  })
  .strict();

export const printerAgentHeartbeatSchema = z
  .object({
    printerName: z.string().trim().min(1).max(180).nullable().optional(),
    appVersion: z.string().trim().min(1).max(40).optional(),
  })
  .strict();

export const printerAgentFailureSchema = z
  .object({
    error: z.string().trim().min(1).max(1000),
  })
  .strict();

export type UpdatePrinterSettingsInput = z.infer<typeof updatePrinterSettingsSchema>;
