const STRONG_PASSWORD_CHARACTER_CLASSES = [/[a-z]/u, /[A-Z]/u, /\d/u, /[^\p{L}\p{N}\s]/u];

export function collectStrongPasswordErrors(password: string) {
  const errors: string[] = [];

  if (password.length < 16 || password.length > 128) {
    errors.push('deve conter entre 16 e 128 caracteres');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    errors.push('deve conter no máximo 72 bytes em UTF-8');
  }
  if (!STRONG_PASSWORD_CHARACTER_CLASSES.every((pattern) => pattern.test(password))) {
    errors.push('deve conter letra minúscula, maiúscula, número e símbolo');
  }
  if (/change[_-]?me|replace[_-]?me|substitua|password|senha123|superadmin/iu.test(password)) {
    errors.push('não pode usar um valor previsível ou placeholder');
  }

  return errors;
}

export function validateStrongPassword(password: string) {
  const errors = collectStrongPasswordErrors(password);
  if (errors.length > 0) {
    throw new Error(`A nova senha ${errors.join('; ')}.`);
  }
}
