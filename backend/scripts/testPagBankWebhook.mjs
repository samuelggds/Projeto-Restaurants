import './_shared/disabledLegacyScript.mjs';
import 'dotenv/config';

const backendBaseUrl = String(process.env.BACKEND_URL || 'http://localhost:3000')
  .trim()
  .replace(/\/+$/, '');
const endpoint = `${backendBaseUrl}/orders/webhook/pagbank`;

const notificationCode = String(process.argv[2] || '').trim();
const transactionCode = String(process.argv[3] || '').trim();
const restaurantId = String(process.argv[4] || '').trim();

function isPlaceholderCode(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase();

  return (
    normalized === 'SEU_NOTIFICATION_CODE_REAL' ||
    normalized === 'SEU_TRANSACTION_CODE_REAL' ||
    normalized === 'NOTIFICATION_CODE_DE_TESTE' ||
    normalized === 'TRANSACTION_CODE_DE_TESTE'
  );
}

if (!notificationCode && !transactionCode) {
  console.error(
    'Uso: node scripts/testPagBankWebhook.mjs <notificationCode> [transactionCode] [restaurantId]',
  );
  process.exit(1);
}

if (isPlaceholderCode(notificationCode) || isPlaceholderCode(transactionCode)) {
  console.error(
    'Codigo de webhook ainda esta como placeholder. Use notificationCode/transactionCode real recebido do PagBank.',
  );
  process.exit(1);
}

const body = new URLSearchParams();
if (notificationCode) {
  body.set('notificationCode', notificationCode);
}
if (transactionCode) {
  body.set('transactionCode', transactionCode);
}
if (restaurantId) {
  body.set('restaurantId', restaurantId);
}

(async () => {
  try {
    console.log(`[PAGBANK_WEBHOOK_TEST] POST ${endpoint} body=${body.toString()}`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const responseText = await response.text();

    console.log(
      JSON.stringify(
        {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: responseText || null,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      '[PAGBANK_WEBHOOK_TEST_ERROR]',
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
})();
