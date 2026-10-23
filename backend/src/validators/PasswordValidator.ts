import { z } from 'zod';
import {
  collectPasswordErrors,
  collectStrongPasswordErrors,
} from '../modules/auth/security/passwordPolicy.js';

function passwordSchemaFrom(
  collectErrors: (password: unknown) => string[],
  label: 'A senha' | 'A senha temporária' = 'A senha',
) {
  return z.string().superRefine((password, context) => {
    const errors = collectErrors(password);

    if (errors.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} ${errors.join('; ')}.`,
      });
    }
  });
}

export const passwordSchema = passwordSchemaFrom(collectPasswordErrors);
export const strongPasswordSchema = passwordSchemaFrom(collectStrongPasswordErrors);
export const temporaryStrongPasswordSchema = passwordSchemaFrom(
  collectStrongPasswordErrors,
  'A senha temporária',
);
