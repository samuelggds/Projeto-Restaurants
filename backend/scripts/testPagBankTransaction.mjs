import "dotenv/config";

const mode = String(process.argv[2] || "")
  .trim()
  .toLowerCase();
const code = String(process.argv[3] || "").trim();

if (!mode || !code || !["notification", "transaction"].includes(mode)) {
  console.error(
    "Uso: node scripts/testPagBankTransaction.mjs <notification|transaction> <code>",
  );
  process.exit(1);
}

const pagBankEmail = String(
  process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || "",
).trim();
const pagBankToken = String(
  process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || "",
).trim();

function isPlaceholderValue(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  return (
    normalized === "SUA_EMAIL_PAGBANK" ||
    normalized === "SEU_TOKEN_PAGBANK" ||
    normalized === "SEU_TRANSACTION_CODE_REAL" ||
    normalized === "SEU_NOTIFICATION_CODE_REAL"
  );
}

if (!pagBankEmail || !pagBankToken) {
  console.error(
    "Configure PAGBANK_EMAIL e PAGBANK_TOKEN (ou PAGSEGURO_EMAIL/PAGSEGURO_TOKEN) antes de rodar este teste.",
  );
  process.exit(1);
}

if (isPlaceholderValue(pagBankEmail) || isPlaceholderValue(pagBankToken)) {
  console.error(
    "Credenciais PagBank ainda estao como placeholder no .env. Atualize PAGBANK_EMAIL e PAGBANK_TOKEN com valores reais.",
  );
  process.exit(1);
}

if (isPlaceholderValue(code)) {
  console.error(
    "O codigo informado ainda esta como placeholder. Use um transactionCode ou notificationCode real do PagBank.",
  );
  process.exit(1);
}

const apiBaseUrl = "https://ws.pagseguro.uol.com.br";

function extractXmlTagValue(xml, tag) {
  const regex = new RegExp(`<${tag}>([^<]+)</${tag}>`, "i");
  const match = regex.exec(String(xml || ""));
  return String(match?.[1] || "").trim();
}

function buildEndpointUrl() {
  if (mode === "notification") {
    return `${apiBaseUrl}/v3/transactions/notifications/${encodeURIComponent(code)}?email=${encodeURIComponent(pagBankEmail)}&token=${encodeURIComponent(pagBankToken)}`;
  }

  return `${apiBaseUrl}/v3/transactions/${encodeURIComponent(code)}?email=${encodeURIComponent(pagBankEmail)}&token=${encodeURIComponent(pagBankToken)}`;
}

(async () => {
  try {
    const endpoint = buildEndpointUrl();

    console.log(
      `[PAGBANK_TRANSACTION_TEST] GET ${endpoint.replace(pagBankToken, "***")}`,
    );

    const response = await fetch(endpoint, { method: "GET" });
    const responseText = await response.text();

    const result = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      parsed: {
        code: extractXmlTagValue(responseText, "code") || null,
        status: extractXmlTagValue(responseText, "status") || null,
        reference: extractXmlTagValue(responseText, "reference") || null,
        grossAmount: extractXmlTagValue(responseText, "grossAmount") || null,
        netAmount: extractXmlTagValue(responseText, "netAmount") || null,
      },
      rawXml: responseText || null,
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(
      "[PAGBANK_TRANSACTION_TEST_ERROR]",
      error instanceof Error ? error.message : String(error),
    );
    process.exitCode = 1;
  }
})();
