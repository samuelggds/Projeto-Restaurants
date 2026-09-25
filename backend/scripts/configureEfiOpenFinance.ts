import {
  efiOpenFinanceConfigured,
  efiOpenFinanceRedirectUrl,
  efiOpenFinanceRequest,
  efiOpenFinanceWebhookHmac,
  efiOpenFinanceWebhookUrl,
} from '../src/modules/payments/providers/efiOpenFinance.js';

async function main() {
  if (!efiOpenFinanceConfigured()) {
    throw new Error('Configure as credenciais, certificado e HMAC da Efí Open Finance antes de continuar.');
  }

  const redirectURL = efiOpenFinanceRedirectUrl();
  const webhookURL = efiOpenFinanceWebhookUrl();
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

  console.log('Efí Open Finance configurada.');
  console.log(`Redirect: ${redirectURL}`);
  console.log(`Webhook: ${webhookURL}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
