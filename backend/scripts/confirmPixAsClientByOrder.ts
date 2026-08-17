import 'dotenv/config';
import prisma from '../src/config/prisma.js';

(async () => {
  try {
    const orderId = Number(process.argv[2] || 44);
    const baseUrl = String(process.env.BACKEND_URL || 'http://127.0.0.1:3000').trim();

    const before = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        restaurantId: true,
        type: true,
        status: true,
        paymentMethod: true,
        paid: true,
        paidAt: true,
        pixPaymentId: true,
      },
    });

    if (!before) {
      throw new Error(`Pedido ${orderId} nao encontrado.`);
    }

    if (String(before.paymentMethod || '').toUpperCase() !== 'PIX') {
      throw new Error(
        `Pedido ${orderId} nao usa PIX (metodo atual: ${String(before.paymentMethod || 'N/A')}).`,
      );
    }

    if (!before.pixPaymentId) {
      throw new Error(`Pedido ${orderId} nao possui pixPaymentId para confirmar.`);
    }

    const paymentId = String(before.pixPaymentId).trim();

    const payload: Record<string, unknown> = {
      orderId: before.id,
      restaurantId: before.restaurantId,
      paymentId,
    };

    if (paymentId.startsWith('manual:')) {
      payload.paymentProof = `comprovante-cliente-${Date.now()}`;
    }

    const response = await fetch(`${baseUrl}/orders/pix/payment/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    const after = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        restaurantId: true,
        type: true,
        status: true,
        paymentMethod: true,
        paid: true,
        paidAt: true,
        pixPaymentId: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          mode: 'client_pix_confirm',
          orderId,
          requestPayload: payload,
          http: {
            status: response.status,
            ok: response.ok,
          },
          before,
          responseBody: data,
          after,
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
