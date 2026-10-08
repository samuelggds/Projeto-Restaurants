import { assertOperationalEnvironment } from './environmentGuard.mjs';
import { requireWriteConfirmation } from './confirmation.mjs';

export function assertDemoSeedAllowed() {
  const context = assertOperationalEnvironment({ targetEnvironment: process.env.NODE_ENV });
  if (!['development', 'test'].includes(context.target)) {
    throw new Error('O seed de demonstração só pode limpar bancos de development ou test.');
  }
  requireWriteConfirmation({
    mode: 'write',
    provided: process.env.SEED_CONFIRM_DATABASE,
    expected: `RESET_DEMO_${context.database.identityHash}`,
    action: 'apagar o banco e criar dados de demonstração (SEED_CONFIRM_DATABASE)',
  });
  return context;
}
