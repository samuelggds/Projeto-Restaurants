export function parseCliArgs(argv) {
  const options = new Map();
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const raw = String(argv[index] ?? '').trim();
    if (!raw.startsWith('--')) {
      positionals.push(raw);
      continue;
    }

    const separatorIndex = raw.indexOf('=');
    const key = raw.slice(2, separatorIndex >= 0 ? separatorIndex : undefined).trim();
    if (!key) {
      throw new Error('Argumento vazio não é permitido.');
    }
    if (options.has(key)) {
      throw new Error(`Argumento duplicado: --${key}`);
    }

    if (separatorIndex >= 0) {
      options.set(key, raw.slice(separatorIndex + 1));
      continue;
    }

    const next = String(argv[index + 1] ?? '').trim();
    if (!next || next.startsWith('--')) {
      options.set(key, true);
      continue;
    }

    options.set(key, next);
    index += 1;
  }

  return { options, positionals };
}

export function rejectPositionals(parsed) {
  if (parsed.positionals.length) {
    throw new Error(
      `Argumentos posicionais não são aceitos: ${parsed.positionals.join(', ')}. Use opções nomeadas (--nome valor).`,
    );
  }
}

export function assertAllowedOptions(parsed, allowedNames) {
  const allowed = new Set(allowedNames);
  const unknown = [...parsed.options.keys()].filter((name) => !allowed.has(name));
  if (unknown.length) {
    throw new Error(`Opção desconhecida: ${unknown.map((name) => `--${name}`).join(', ')}.`);
  }
}

export function hasFlag(parsed, ...names) {
  return names.some((name) => parsed.options.get(name) === true);
}

export function optionalString(parsed, ...names) {
  for (const name of names) {
    const value = parsed.options.get(name);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function requiredString(parsed, label, ...names) {
  const value = optionalString(parsed, ...names);
  if (!value) {
    throw new Error(`${label} é obrigatório (${names.map((name) => `--${name}`).join(' ou ')}).`);
  }
  return value;
}

export function requiredPositiveInteger(parsed, label, ...names) {
  const raw = requiredString(parsed, label, ...names);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} deve ser um inteiro maior que zero.`);
  }
  return value;
}

export function optionalPositiveInteger(parsed, fallback, label, ...names) {
  const raw = optionalString(parsed, ...names);
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} deve ser um inteiro maior que zero.`);
  }
  return value;
}

export function requiredNonNegativeNumber(parsed, label, ...names) {
  const raw = requiredString(parsed, label, ...names);
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} deve ser um número maior ou igual a zero.`);
  }
  return value;
}
