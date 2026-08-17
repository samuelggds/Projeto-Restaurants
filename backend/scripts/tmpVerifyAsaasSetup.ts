import 'dotenv/config';
import prisma from '../src/config/prisma.js';

type CheckResult = {
  key: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  detail: string;
};

const RESTAURANT_ID = Number(process.env.E2E_RESTAURANT_ID || 2);

function hasValue(value: unknown) {
  return String(value || '').trim().length > 0;
}

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function boolLabel(value: boolean) {
  return value ? 'PASS' : 'FAIL';
}

(async () => {
  const checks: CheckResult[] = [];

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: RESTAURANT_ID },
      select: {
        id: true,
        name: true,
        slug: true,
        cnpj: true,
        active: true,
      },
    });

    if (!restaurant) {
      console.log(
        JSON.stringify(
          {
            ok: false,
            restaurantId: RESTAURANT_ID,
            error: 'Restaurante nao encontrado.',
          },
          null,
          2,
        ),
      );
      process.exitCode = 1;
      return;
    }

    const settings = await prisma.restaurantSettings.findUnique({
      where: { restaurantId: RESTAURANT_ID },
      select: {
        restaurantId: true,
        pixProvider: true,
        cardGateway: true,
        asaasAccessToken: true,
        gatewayMerchantId: true,
        pixKey: true,
      },
    });

    checks.push({
      key: 'restaurant.active',
      status: restaurant.active ? 'PASS' : 'WARN',
      detail: restaurant.active ? 'Restaurante ativo.' : 'Restaurante inativo.',
    });

    checks.push({
      key: 'restaurant.slug',
      status: hasValue(restaurant.slug) ? 'PASS' : 'FAIL',
      detail: hasValue(restaurant.slug) ? 'Slug preenchido.' : 'Slug ausente.',
    });

    checks.push({
      key: 'restaurant.cnpj',
      status: hasValue(restaurant.cnpj) ? 'PASS' : 'WARN',
      detail: hasValue(restaurant.cnpj)
        ? 'CNPJ preenchido.'
        : 'CNPJ ausente no cadastro do restaurante.',
    });

    checks.push({
      key: 'settings.exists',
      status: settings ? 'PASS' : 'FAIL',
      detail: settings
        ? 'Registro de configuracoes encontrado.'
        : 'Registro de configuracoes ausente.',
    });

    const pixProviderAsaas = normalize(settings?.pixProvider) === 'ASAAS';
    checks.push({
      key: 'settings.pixProvider',
      status: settings ? (pixProviderAsaas ? 'PASS' : 'FAIL') : 'FAIL',
      detail: settings
        ? `pixProvider=${String(settings.pixProvider || '').trim() || '(vazio)'}`
        : 'Nao foi possivel validar sem settings.',
    });

    const cardGatewayAsaas = normalize(settings?.cardGateway) === 'ASAAS';
    checks.push({
      key: 'settings.cardGateway',
      status: settings ? (cardGatewayAsaas ? 'PASS' : 'FAIL') : 'FAIL',
      detail: settings
        ? `cardGateway=${String(settings.cardGateway || '').trim() || '(vazio)'}`
        : 'Nao foi possivel validar sem settings.',
    });

    const tokenConfigured = hasValue(settings?.asaasAccessToken);
    checks.push({
      key: 'settings.asaasAccessToken',
      status: tokenConfigured ? 'PASS' : 'FAIL',
      detail: tokenConfigured
        ? 'Token Asaas configurado no restaurante.'
        : 'asaasAccessToken vazio.',
    });

    const walletConfigured = hasValue(settings?.gatewayMerchantId);
    checks.push({
      key: 'settings.gatewayMerchantId',
      status: walletConfigured ? 'PASS' : 'WARN',
      detail: walletConfigured
        ? 'Wallet/merchant id configurado.'
        : 'gatewayMerchantId vazio (split/carteira pode falhar).',
    });

    const pixKeyConfigured = hasValue(settings?.pixKey);
    checks.push({
      key: 'settings.pixKey',
      status: pixKeyConfigured ? 'PASS' : 'WARN',
      detail: pixKeyConfigured
        ? 'Chave PIX preenchida no formulario.'
        : 'pixKey vazio no formulario.',
    });

    const webhookTokenConfigured = hasValue(process.env.ASAAS_WEBHOOK_TOKEN);
    checks.push({
      key: 'env.ASAAS_WEBHOOK_TOKEN',
      status: webhookTokenConfigured ? 'PASS' : 'FAIL',
      detail: webhookTokenConfigured
        ? 'Token de webhook configurado.'
        : 'ASAAS_WEBHOOK_TOKEN ausente.',
    });

    const withdrawWebhookTokenConfigured = hasValue(
      process.env.ASAAS_WITHDRAW_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_TOKEN,
    );
    checks.push({
      key: 'env.ASAAS_WITHDRAW_WEBHOOK_TOKEN',
      status: withdrawWebhookTokenConfigured ? 'PASS' : 'WARN',
      detail: withdrawWebhookTokenConfigured
        ? 'Token de webhook de saque configurado (direto ou fallback).'
        : 'ASAAS_WITHDRAW_WEBHOOK_TOKEN ausente.',
    });

    const fallbackEnabled =
      String(process.env.ALLOW_GLOBAL_PAYMENT_FALLBACK || '').trim() === 'true';
    checks.push({
      key: 'env.ALLOW_GLOBAL_PAYMENT_FALLBACK',
      status: fallbackEnabled ? 'WARN' : 'PASS',
      detail: fallbackEnabled
        ? 'Fallback global ATIVO (nao e estritamente so Asaas por restaurante).'
        : 'Fallback global desativado.',
    });

    const hasFail = checks.some((check) => check.status === 'FAIL');
    const readyStrictAsaasOnly =
      !hasFail && pixProviderAsaas && cardGatewayAsaas && tokenConfigured;

    console.log(
      JSON.stringify(
        {
          ok: !hasFail,
          readyStrictAsaasOnly,
          restaurant: {
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            active: restaurant.active,
            cnpjConfigured: hasValue(restaurant.cnpj),
          },
          summary: {
            pass: checks.filter((c) => c.status === 'PASS').length,
            warn: checks.filter((c) => c.status === 'WARN').length,
            fail: checks.filter((c) => c.status === 'FAIL').length,
          },
          checks,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
