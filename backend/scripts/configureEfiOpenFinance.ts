import 'dotenv/config';
import {
  efiOpenFinanceConfigured,
  efiOpenFinanceRedirectUrl,
  efiOpenFinanceRequest,
  efiOpenFinanceWebhookHmac,
  efiOpenFinanceWebhookUrl,
} from '../src/modules/payments/providers/efiOpenFinance.js';
import {
  assertAllowedOptions,
  hasFlag,
  optionalString,
  parseCliArgs,
  rejectPositionals,
  requiredString,
} from './_shared/cli.mjs';
import {
  requireReason,
  requireWriteConfirmation,
  resolveExecutionMode,
} from './_shared/confirmation.mjs';
import { assertOperationalEnvironment } from './_shared/environmentGuard.mjs';

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2));
  rejectPositionals(parsed);
  assertAllowedOptions(parsed, [
    'environment',
    'apply',
    'dry-run',
    'reason',
    'actor',
    'confirm',
    'allow-production',
  ]);

  const environment = requiredString(parsed, 'Ambiente alvo', 'environment');
  const mode = resolveExecutionMode({
    apply: hasFlag(parsed, 'apply'),
    dryRun: hasFlag(parsed, 'dry-run'),
  });
  const reason = optionalString(parsed, 'reason');
  const actor = optionalString(parsed, 'actor');
  const context = assertOperationalEnvironment({
    targetEnvironment: environment,
    allowProduction: hasFlag(parsed, 'allow-production'),
    requireDatabase: false,
    requireDatabaseEnvironment: false,
  });

  if (!efiOpenFinanceConfigured()) {
    throw new Error(
      'Configure as credenciais, certificado e HMAC da Efí Open Finance antes de continuar.',
    );
  }

  const efiEnvironment = String(process.env.EFI_OPEN_FINANCE_ENV || 'homologation')
    .trim()
    .toLowerCase();
  const expectedEfiEnvironment = context.target === 'production' ? 'production' : 'homologation';
  if (efiEnvironment !== expectedEfiEnvironment) {
    throw new Error(
      `EFI_OPEN_FINANCE_ENV=${efiEnvironment} não corresponde ao ambiente operacional ${context.target}. Esperado: ${expectedEfiEnvironment}.`,
    );
  }

  const redirectURL = efiOpenFinanceRedirectUrl();
  const webhookURL = efiOpenFinanceWebhookUrl();
  const expectedConfirmation = `CONFIGURE_EFI_OPEN_FINANCE:${context.target}`;

  requireReason(mode, reason);
  if (mode === 'write' && actor.length < 3) {
    throw new Error('--actor é obrigatório para escrita e identifica o operador/ticket.');
  }
  requireWriteConfirmation({
    mode,
    provided: optionalString(parsed, 'confirm'),
    expected: expectedConfirmation,
    action: 'configurar redirect e webhook da Efí Open Finance',
  });

  const plan = {
    mode,
    operation: 'CONFIGURE_EFI_OPEN_FINANCE',
    environment: context.target,
    efiEnvironment,
    redirectURL,
    webhookURL,
    actor: actor || null,
    reason: reason || null,
  };

  if (mode === 'dry-run') {
    console.log(JSON.stringify(plan, null, 2));
    console.log(
      `DRY_RUN: revise o plano e execute com --apply --actor="..." --reason="..." --confirm="${expectedConfirmation}".`,
    );
    return;
  }

  const result = await efiOpenFinanceRequest<Record<string, unknown>>('PUT', '/v1/config', {
    data: {
      redirectURL,
      webhookURL,
      webhookSecurity: {
        type: 'hmac',
        hash: efiOpenFinanceWebhookHmac(),
      },
      processPayment: 'async',
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`A Efí recusou a configuração Open Finance (HTTP ${result.status}).`);
  }

  console.log(JSON.stringify({ status: 'applied', ...plan }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
