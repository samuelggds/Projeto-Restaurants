export type PasswordPolicy = Readonly<{
  minLength: number;
  maxLength?: number;
  maxBytes?: number;
  rejectPredictableValues?: boolean;
}>;

export type PasswordRequirementId =
  | 'length'
  | 'lowercase'
  | 'uppercase'
  | 'number'
  | 'special'
  | 'maxBytes'
  | 'notPredictable'
  | 'confirmation';

export type PasswordRequirement = Readonly<{
  id: PasswordRequirementId;
  label: string;
  met: boolean;
}>;

export type PasswordEvaluation = Readonly<{
  requirements: PasswordRequirement[];
  errors: string[];
  isValid: boolean;
}>;

export const STANDARD_PASSWORD_POLICY: PasswordPolicy = Object.freeze({
  minLength: 8,
  maxLength: 128,
  maxBytes: 72,
});

export const PRIVILEGED_PASSWORD_POLICY: PasswordPolicy = Object.freeze({
  ...STANDARD_PASSWORD_POLICY,
  rejectPredictableValues: true,
});

const PREDICTABLE_PASSWORD_PATTERN =
  /change[_-]?me|replace[_-]?me|substitua|password|senha123|superadmin/iu;

function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function hasAllowedLength(password: string, policy: PasswordPolicy) {
  return (
    password.length >= policy.minLength &&
    (policy.maxLength === undefined || password.length <= policy.maxLength)
  );
}

export function getPasswordRequirements(
  password: string,
  confirmation: string,
  policy: PasswordPolicy = STANDARD_PASSWORD_POLICY,
): PasswordRequirement[] {
  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: `Pelo menos ${policy.minLength} caracteres`,
      met: hasAllowedLength(password, policy),
    },
    {
      id: 'uppercase',
      label: 'Uma letra maiúscula',
      met: /\p{Lu}/u.test(password),
    },
    {
      id: 'lowercase',
      label: 'Uma letra minúscula',
      met: /\p{Ll}/u.test(password),
    },
    {
      id: 'number',
      label: 'Um número',
      met: /\p{N}/u.test(password),
    },
    {
      id: 'special',
      label: 'Um caractere especial',
      met: /[^\p{L}\p{N}\s]/u.test(password),
    },
  ];

  // O limite de bytes protege o hash, mas só precisa aparecer no checklist
  // quando for ultrapassado. Assim o fluxo comum mantém os seis requisitos
  // que ajudam a pessoa a criar a senha.
  if (policy.maxBytes !== undefined && byteLength(password) > policy.maxBytes) {
    requirements.push({
      id: 'maxBytes',
      label: `No máximo ${policy.maxBytes} bytes`,
      met: false,
    });
  }

  if (policy.rejectPredictableValues) {
    requirements.push({
      id: 'notPredictable',
      label: 'Não usar senha previsível ou temporária',
      met: password.length > 0 && !PREDICTABLE_PASSWORD_PATTERN.test(password),
    });
  }

  requirements.push({
    id: 'confirmation',
    label: 'Confirmação igual à nova senha',
    met: confirmation.length > 0 && password === confirmation,
  });

  return requirements;
}

export function validatePassword(
  password: string,
  confirmation: string,
  policy: PasswordPolicy = STANDARD_PASSWORD_POLICY,
): string[] {
  const errors: string[] = [];

  if (password.length < policy.minLength) {
    errors.push(`A senha deve ter pelo menos ${policy.minLength} caracteres.`);
  }
  if (policy.maxLength !== undefined && password.length > policy.maxLength) {
    errors.push(`A senha deve ter no máximo ${policy.maxLength} caracteres.`);
  }
  if (!/\p{Lu}/u.test(password)) {
    errors.push('Inclua pelo menos uma letra maiúscula.');
  }
  if (!/\p{Ll}/u.test(password)) {
    errors.push('Inclua pelo menos uma letra minúscula.');
  }
  if (!/\p{N}/u.test(password)) {
    errors.push('Inclua pelo menos um número.');
  }
  if (!/[^\p{L}\p{N}\s]/u.test(password)) {
    errors.push('Inclua pelo menos um caractere especial.');
  }
  if (policy.maxBytes !== undefined && byteLength(password) > policy.maxBytes) {
    errors.push(`A senha deve ocupar no máximo ${policy.maxBytes} bytes.`);
  }
  if (policy.rejectPredictableValues && PREDICTABLE_PASSWORD_PATTERN.test(password)) {
    errors.push('Não use uma senha previsível ou temporária.');
  }
  if (!confirmation || password !== confirmation) {
    errors.push('A confirmação deve ser igual à nova senha.');
  }

  return errors;
}

export function evaluatePassword(
  password: string,
  confirmation: string,
  policy: PasswordPolicy = STANDARD_PASSWORD_POLICY,
): PasswordEvaluation {
  const requirements = getPasswordRequirements(password, confirmation, policy);
  const errors = validatePassword(password, confirmation, policy);

  return {
    requirements,
    errors,
    isValid: errors.length === 0,
  };
}
