export function validatePrivilegedPassword(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 16 || password.length > 128) {
    errors.push('Use entre 16 e 128 caracteres.');
  }
  if (new TextEncoder().encode(password).length > 72) {
    errors.push('A senha deve ocupar no máximo 72 bytes.');
  }
  if (!/[a-z]/u.test(password) || !/[A-Z]/u.test(password)) {
    errors.push('Inclua letras minúsculas e maiúsculas.');
  }
  if (!/\d/u.test(password)) {
    errors.push('Inclua pelo menos um número.');
  }
  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    errors.push('Inclua pelo menos um símbolo.');
  }
  if (/change[_-]?me|replace[_-]?me|substitua|password|senha123|superadmin/iu.test(password)) {
    errors.push('Não use uma senha previsível ou placeholder.');
  }

  return errors;
}
