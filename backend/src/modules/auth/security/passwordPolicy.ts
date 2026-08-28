import { randomBytes } from 'node:crypto';

export const PASSWORD_POLICY = Object.freeze({
  minimumLength: 8,
  maximumLength: 128,
  maximumUtf8Bytes: 72,
});

const REQUIRED_PASSWORD_CHARACTER_CLASSES = [/\p{Ll}/u, /\p{Lu}/u, /\p{N}/u, /[^\p{L}\p{N}\s]/u];
const PREDICTABLE_PASSWORD_PATTERN =
  /change[_-]?me|replace[_-]?me|substitua|password|senha123|superadmin/iu;

type PasswordPolicyOptions = {
  minimumLength: number;
  rejectPredictableValues: boolean;
};

function collectPasswordPolicyErrors(
  password: unknown,
  { minimumLength, rejectPredictableValues }: PasswordPolicyOptions,
) {
  const errors: string[] = [];

  if (typeof password !== 'string') {
    return ['deve ser informada'];
  }

  if (password.length < minimumLength || password.length > PASSWORD_POLICY.maximumLength) {
    errors.push(`deve conter entre ${minimumLength} e ${PASSWORD_POLICY.maximumLength} caracteres`);
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_POLICY.maximumUtf8Bytes) {
    errors.push(`deve conter no máximo ${PASSWORD_POLICY.maximumUtf8Bytes} bytes em UTF-8`);
  }
  if (!REQUIRED_PASSWORD_CHARACTER_CLASSES.every((pattern) => pattern.test(password))) {
    errors.push('deve conter letra minúscula, maiúscula, número e símbolo');
  }
  if (rejectPredictableValues && PREDICTABLE_PASSWORD_PATTERN.test(password)) {
    errors.push('não pode usar um valor previsível ou placeholder');
  }

  return errors;
}

export function collectPasswordErrors(password: unknown) {
  return collectPasswordPolicyErrors(password, {
    minimumLength: PASSWORD_POLICY.minimumLength,
    rejectPredictableValues: false,
  });
}

export function collectStrongPasswordErrors(password: unknown) {
  return collectPasswordPolicyErrors(password, {
    minimumLength: PASSWORD_POLICY.minimumLength,
    rejectPredictableValues: true,
  });
}

function assertPasswordPolicy(errors: string[], label: string) {
  if (errors.length > 0) {
    throw new Error(`${label} ${errors.join('; ')}.`);
  }
}

export function validatePassword(password: unknown, label = 'A senha') {
  assertPasswordPolicy(collectPasswordErrors(password), label);
}

export function validateStrongPassword(password: unknown, label = 'A nova senha') {
  const errors = collectStrongPasswordErrors(password);
  assertPasswordPolicy(errors, label);
}

export function generateStrongRandomPassword() {
  // O prefixo garante todas as classes exigidas independentemente dos bytes aleatórios.
  const password = `Aa1!${randomBytes(32).toString('base64url')}`;
  validateStrongPassword(password, 'A senha gerada');
  return password;
}
