import { z } from 'zod';

const managedCredentialPatterns = [
  /\b(?:access[_ -]?token|secret[_ -]?key|api[_ -]?key|password|senha)\s*[:=]\s*\S{6,}/iu,
  /\bBearer\s+[A-Za-z0-9._-]{12,}/u,
  /\bAPP_USR-[A-Za-z0-9-]{10,}/u,
  /\bsk-[A-Za-z0-9_-]{12,}/u,
];

function rejectManagedCredentialText(value: string | null | undefined) {
  if (!value) return true;
  return !managedCredentialPatterns.some((pattern) => pattern.test(value));
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
    if (!rejectManagedCredentialText(combined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message:
          'Não envie senhas, tokens, chaves de API ou credenciais de pagamento nesta solicitação.',
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
  .strict();

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
    if (!rejectManagedCredentialText(value.response)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['response'],
        message: 'Não inclua senhas, tokens, chaves de API ou credenciais na resposta.',
      });
    }
  });
