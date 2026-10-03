import { z } from 'zod';

const managedSensitivePatterns = [
  /\b(?:access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|secret[_ -]?key|api[_ -]?key|private[_ -]?key|webhook[_ -]?secret|password|senha)\s*[:=]\s*\S{4,}/iu,
  /\b(?:mfa|otp|totp|2fa)(?:[_ -]?(?:code|codigo|código))?\s*[:=]\s*\d{4,10}\b/iu,
  /\b(?:ag[eê]ncia|conta(?:\s+banc[aá]ria)?|bank[_ -]?account|iban|swift)\s*[:=]\s*[A-Za-z0-9./-]{3,}/iu,
  /\b(?:cpf|cnpj|chave[_ -]?pix|pix[_ -]?key)\s*[:=]\s*\S{5,}/iu,
  /\b(?:cvv|cvc|n[uú]mero[_ -]?do[_ -]?cart[aã]o|card[_ -]?number)\s*[:=]\s*[\d -]{3,}/iu,
  /\bBearer\s+[A-Za-z0-9._-]{12,}/u,
  /\bAPP_USR-[A-Za-z0-9-]{10,}/u,
  /\bsk-[A-Za-z0-9_-]{12,}/u,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u,
];

function rejectManagedSensitiveText(value: string | null | undefined) {
  if (!value) return true;
  return !managedSensitivePatterns.some((pattern) => pattern.test(value));
}

export const managedRequestCreateSchema = z
  .object({
    category: z.enum([
      'PRODUTO',
      'PRECO',
      'CATEGORIA',
      'COMBO',
      'BANNER',
      'APARENCIA',
      'CONFIGURACAO',
      'OUTRO',
    ]),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(10).max(2000),
  })
  .strict()
  .superRefine((value, ctx) => {
    const combined = `${value.title}\n${value.description}`;
    if (!rejectManagedSensitiveText(combined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message:
          'Não envie senhas, tokens, chaves de API, códigos MFA ou dados bancários nesta solicitação.',
      });
    }
  });

export const implementationUpdateSchema = z
  .object({
    status: z.enum([
      'AGUARDANDO_MATERIAL',
      'EM_IMPLANTACAO',
      'AGUARDANDO_CLIENTE',
      'EM_REVISAO',
      'CONCLUIDA',
      'CANCELADA',
    ]),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!rejectManagedSensitiveText(value.notes)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notes'],
        message:
          'Não inclua credenciais, códigos MFA ou dados bancários nas observações da implantação.',
      });
    }
  });

export const managedRequestUpdateSchema = z
  .object({
    status: z.enum([
      'ABERTA',
      'EM_ANALISE',
      'EM_EXECUCAO',
      'AGUARDANDO_CLIENTE',
      'CONCLUIDA',
      'CANCELADA',
    ]),
    response: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!rejectManagedSensitiveText(value.response)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['response'],
        message: 'Não inclua senhas, tokens, chaves de API, códigos MFA ou dados bancários na resposta.',
      });
    }
  });
