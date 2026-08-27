import { timingSafeEqual } from 'node:crypto';

export function resolveExecutionMode({ apply = false, dryRun = false, execute = false } = {}) {
  const writeRequested = Boolean(apply || execute);
  if (writeRequested && dryRun) {
    throw new Error('Escolha apenas um modo: escrita (--apply/--execute) ou --dry-run.');
  }
  return writeRequested ? 'write' : 'dry-run';
}

export function requireWriteConfirmation({ mode, provided, expected, action }) {
  if (mode !== 'write') {
    return;
  }

  const actualBuffer = Buffer.from(String(provided ?? ''), 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const matches =
    actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);

  if (!matches) {
    throw new Error(
      `Confirmação ausente ou incorreta para ${action}. Revise o dry-run e use --confirm=${expected}.`,
    );
  }
}

export function requireReason(mode, reason) {
  if (mode === 'write' && String(reason ?? '').trim().length < 8) {
    throw new Error('--reason é obrigatório para escrita e deve explicar a operação (mínimo de 8 caracteres).');
  }
}
