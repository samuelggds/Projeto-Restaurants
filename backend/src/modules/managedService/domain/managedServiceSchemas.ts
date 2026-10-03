import { z } from 'zod';

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
  .strict();

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
  .strict();
