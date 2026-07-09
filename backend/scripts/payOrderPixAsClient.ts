import "dotenv/config";
import prisma from "../src/config/prisma.js";

(async () => {
  try {
    const orderId = Number(process.argv[2] || 44);
    const baseUrl = String(
      process.env.BACKEND_URL || "http://127.0.0.1:3000",
    ).trim();

    const before = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        restaurantId: true,
        type: true,
        paymentMethod: true,
        paid: true,
        paidAt: true,
        pixPaymentId: true,
        status: true,
      },
    });

    if (!before) {
      throw new Error(`Pedido ${orderId} nao encontrado.`);
    }

    if (String(before.paymentMethod || "").toUpperCase() !== "PIX") {
      throw new Error(
        `Pedido ${orderId} nao esta em PIX (metodo: ${String(before.paymentMethod || "N/A")}).`,
      );
    }

    let paymentId = String(before.pixPaymentId || "").trim();

    if (!paymentId) {
      paymentId = `manual:PICPAY:${before.restaurantId}:${Date.now()}`;

      await prisma.order.update({
        where: { id: orderId },
        data: {
          pixPaymentId: paymentId,
        },
      });
    }

    const payload: Record<string, unknown> = {
      orderId: before.id,
      restaurantId: before.restaurantId,
      paymentId,
    };

    if (paymentId.startsWith("manual:")) {
      payload.paymentProof = `cliente-confirmou-pix-${Date.now()}`;
    }

    const response = await fetch(`${baseUrl}/orders/pix/payment/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
        paymentMethod: true,
        paid: true,
        paidAt: true,
        pixPaymentId: true,
        status: true,
      },
    });

    console.log(
      JSON.stringify(
        {
          mode: "client_pix_payment",
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
