import 'dotenv/config';
import restaurantSettingsRepository from '../src/modules/restaurantSettings/repositories/RestaurantSettingsRepository.js';
import prisma from '../src/config/prisma.js';

function maskEmail(value: string) {
  const [local, domain] = String(value || '').split('@');
  if (!local || !domain) {
    return '';
  }

  const localMasked = local.length <= 2 ? `${local[0] || ''}*` : `${local.slice(0, 2)}***`;

  return `${localMasked}@${domain}`;
}

function tokenFingerprint(value: string) {
  const text = String(value || '').trim();
  if (!text) {
    return null;
  }

  return {
    length: text.length,
    head: text.slice(0, 4),
    tail: text.slice(-4),
  };
}

(async () => {
  try {
    const restaurantId = Number(process.argv[2] || 1);
    const settings = await restaurantSettingsRepository.findByRestaurantId(restaurantId);

    const settingsEmail = String(settings?.pagbankEmail || '').trim();
    const settingsToken = String(settings?.pagbankToken || '').trim();

    const envEmail = String(process.env.PAGBANK_EMAIL || process.env.PAGSEGURO_EMAIL || '').trim();
    const envToken = String(process.env.PAGBANK_TOKEN || process.env.PAGSEGURO_TOKEN || '').trim();

    const effectiveEmail = settingsEmail || envEmail;
    const effectiveToken = settingsToken || envToken;

    const source = {
      email: settingsEmail ? 'restaurant_settings' : envEmail ? 'env' : 'none',
      token: settingsToken ? 'restaurant_settings' : envToken ? 'env' : 'none',
    };

    const lastPagbankTxOrder = await prisma.order.findFirst({
      where: {
        restaurantId,
        paymentMethod: 'CARTAO',
        cardCheckoutSessionId: {
          startsWith: 'pagbank_tx:',
        },
      },
      select: {
        id: true,
        status: true,
        paid: true,
        cardCheckoutSessionId: true,
        createdAt: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    console.log(
      JSON.stringify(
        {
          restaurantId,
          restaurantName: settings?.restaurant?.name || null,
          source,
          effectiveEmailMasked: maskEmail(effectiveEmail),
          effectiveTokenFingerprint: tokenFingerprint(effectiveToken),
          envEmailMasked: maskEmail(envEmail),
          envTokenFingerprint: tokenFingerprint(envToken),
          settingsEmailMasked: maskEmail(settingsEmail),
          settingsTokenFingerprint: tokenFingerprint(settingsToken),
          lastPagbankTxOrder,
          hints: [
            '401 Unauthorized normalmente indica email/token invalidos ou sem permissao para estorno.',
            'Se source=email/token for restaurant_settings, ajuste na tela de configuracoes do restaurante.',
            'Se source=email/token for env, ajuste PAGBANK_EMAIL/PAGBANK_TOKEN no backend/.env.',
          ],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
