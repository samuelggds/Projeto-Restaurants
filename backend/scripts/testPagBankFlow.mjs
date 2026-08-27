import './_shared/disabledLegacyScript.mjs';
import 'dotenv/config';

const mode = String(process.argv[2] || '')
  .trim()
  .toLowerCase();
const inputCode = String(process.argv[3] || '').trim();
const optionalArgs = process.argv
  .slice(4)
  .map((arg) => String(arg || '').trim())
  .filter(Boolean);
const restaurantId = optionalArgs.find((arg) => /^\d+$/.test(arg)) || '';
const webhookOnly = optionalArgs.some((arg) => {
  const normalizedArg = arg.toLowerCase();
  return normalizedArg === '--webhook-only' || normalizedArg === 'webhook-only';
});

if (!mode || !inputCode || !['notification', 'transaction'].includes(mode)) {
  console.error(
    'Uso: node scripts/testPagBankFlow.mjs <notification|transaction> <code> [restaurantId] [--webhook-only]',
  );
  process.exit(1);
}

const backendBaseUrl = String(process.env.BACKEND_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '');
const webhookEndpoint = `${backendBaseUrl}/orders/webhook/pagbank`;

const pagBankEmail = String(process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || '').trim();
const pagBankToken = String(process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || '').trim();
const pagBankApiBaseUrl = 'https://ws.pagseguro.uol.com.br';

function isPlaceholderValue(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();
  return (
    normalized === 'SUA_EMAIL_PAGBANK' ||
    normalized === 'SEU_TOKEN_PAGBANK' ||
    normalized === 'SEU_TRANSACTION_CODE_REAL' ||
    normalized === 'SEU_NOTIFICATION_CODE_REAL'
  );
}

if (!webhookOnly && (!pagBankEmail || !pagBankToken)) {
  console.error(
    'Configure PAGBANK_EMAIL e PAGBANK_TOKEN (ou PAGSEGURO_EMAIL/PAGSEGURO_TOKEN) antes de rodar este fluxo.',
  );
  process.exit(1);
}

if (!webhookOnly && (isPlaceholderValue(pagBankEmail) || isPlaceholderValue(pagBankToken))) {
  console.error(
    'Credenciais PagBank ainda estao como placeholder no .env. Atualize PAGBANK_EMAIL e PAGBANK_TOKEN com valores reais.',
  );
  process.exit(1);
}

if (isPlaceholderValue(inputCode)) {
  console.error(
    'O codigo informado ainda esta como placeholder. Use um transactionCode ou notificationCode real do PagBank.',
  );
  process.exit(1);
}

function extractXmlTagValue(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, 'i');
  const match = regex.exec(String(xml || ''));
  return String(match?.[1] || '').trim();
}

function buildPagBankEndpointUrl() {
  if (mode === 'notification') {
    return `${pagBankApiBaseUrl}/v3/transactions/notifications/${encodeURIComponent(inputCode)}?email=${encodeURIComponent(pagBankEmail)}&token=${encodeURIComponent(pagBankToken)}`;
  }

  return `${pagBankApiBaseUrl}/v3/transactions/${encodeURIComponent(inputCode)}?email=${encodeURIComponent(pagBankEmail)}&token=${encodeURIComponent(pagBankToken)}`;
}

function redactToken(url) {
  return String(url).replace(pagBankToken, '***');
}

(async () => {
  try {
    if (!webhookOnly) {
      const pagBankEndpoint = buildPagBankEndpointUrl();

      console.log(`[PAGBANK_FLOW_TEST] STEP 1/2 GET ${redactToken(pagBankEndpoint)}`);

      const transactionResponse = await fetch(pagBankEndpoint, {
        method: 'GET',
      });
      const transactionXml = await transactionResponse.text();

      const parsed = {
        code: extractXmlTagValue(transactionXml, 'code') || null,
        status: extractXmlTagValue(transactionXml, 'status') || null,
        reference: extractXmlTagValue(transactionXml, 'reference') || null,
        grossAmount: extractXmlTagValue(transactionXml, 'grossAmount') || null,
        netAmount: extractXmlTagValue(transactionXml, 'netAmount') || null,
      };

      console.log(
        JSON.stringify(
          {
            step: 'transaction-query',
            ok: transactionResponse.ok,
            status: transactionResponse.status,
            statusText: transactionResponse.statusText,
            parsed,
          },
          null,
          2,
        ),
      );

      if (!transactionResponse.ok) {
        console.error('[PAGBANK_FLOW_TEST] Falha na consulta da transacao. Fluxo interrompido.');
        process.exitCode = 1;
        return;
      }
    } else {
      console.log('[PAGBANK_FLOW_TEST] STEP 1/2 SKIPPED (webhook-only mode enabled)');
    }

    const webhookBody = new URLSearchParams();

    if (mode === 'notification') {
      webhookBody.set('notificationCode', inputCode);
    } else {
      webhookBody.set('transactionCode', inputCode);
    }
    if (restaurantId) {
      webhookBody.set('restaurantId', restaurantId);
    }

    console.log(
      `[PAGBANK_FLOW_TEST] STEP 2/2 POST ${webhookEndpoint} body=${webhookBody.toString()}`,
    );

    const webhookResponse = await fetch(webhookEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: webhookBody.toString(),
    });

    const webhookBodyText = await webhookResponse.text();

    console.log(
      JSON.stringify(
        {
          step: 'webhook-dispatch',
          ok: webhookResponse.ok,
          status: webhookResponse.status,
          statusText: webhookResponse.statusText,
          body: webhookBodyText || null,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      '[PAGBANK_FLOW_TEST_ERROR]',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
})();
