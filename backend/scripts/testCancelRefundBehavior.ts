import 'dotenv/config';
import jwt from 'jsonwebtoken';
import prisma from '../src/config/prisma.js';

type CancelResult = {
  orderId: number;
  httpStatus: number;
  ok: boolean;
  body: unknown;
  orderStatusAfter: string | null;
  orderPaidAfter: boolean | null;
};

function buildToken(userId: number, restaurantId: number, email: string | null) {
  const secret = String(process.env.JWT_SECRET || '').trim();

  if (!secret) {
    throw new Error('JWT_SECRET nao configurado.');
  }

  return jwt.sign(
    {
      id: userId,
      role: 'CLIENTE',
      restaurantId,
      email,
    },
    secret,
    { expiresIn: '30m' },
  );
}

async function cancelOrderAsCustomer(
  baseUrl: string,
  orderId: number,
  userId: number,
  restaurantId: number,
  email: string | null,
): Promise<CancelResult> {
  const token = buildToken(userId, restaurantId, email);

  const response = await fetch(`${baseUrl}/orders/${orderId}/cancel`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  const body = await response.json().catch(() => ({}));
  const after = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      paid: true,
    },
  });

  return {
    orderId,
    httpStatus: response.status,
    ok: response.ok,
    body,
    orderStatusAfter: after?.status || null,
    orderPaidAfter: after?.paid ?? null,
  };
}

(async () => {
  try {
    const restaurantId = Number(process.argv[2] || 1);
    const baseUrl = String(process.env.BACKEND_URL || 'http://127.0.0.1:3000').trim();
    const marker = `TESTE_CANCEL_REFUND_${Date.now()}`;

    const user = await prisma.user.findFirst({
      where: {
        restaurantId,
        active: true,
        role: 'CLIENTE',
      },
      select: {
        id: true,
        email: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (!user) {
      throw new Error(`Nenhum cliente ativo encontrado para restaurante ${restaurantId}.`);
    }

    const product = await prisma.product.findFirst({
      where: {
        restaurantId,
        active: true,
      },
      select: {
        id: true,
        price: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (!product) {
      throw new Error(`Nenhum produto ativo encontrado para restaurante ${restaurantId}.`);
    }

    const price = Number(product.price || 0);

    const paidPixOrder = await prisma.order.create({
      data: {
        total: price,
        status: 'PENDENTE',
        type: 'DELIVERY',
        paymentMethod: 'PIX',
        paid: true,
        paidAt: new Date(),
        pixPaymentId: `manual:PICPAY:${restaurantId}:${Date.now()}`,
        paymentProof: `proof-${Date.now()}`,
        observation: `${marker} | PIX_PAGO`,
        address: 'Rua Teste',
        number: '1',
        district: 'Centro',
        city: 'Fortaleza',
        state: 'CE',
        zipCode: '60000000',
        userId: user.id,
        restaurantId,
      },
      select: { id: true },
    });

    await prisma.orderItem.create({
      data: {
        orderId: paidPixOrder.id,
        productId: product.id,
        quantity: 1,
        price,
      },
    });

    const unpaidMoneyOrder = await prisma.order.create({
      data: {
        total: price,
        status: 'PENDENTE',
        type: 'DELIVERY',
        paymentMethod: 'DINHEIRO',
        paid: false,
        observation: `${marker} | DINHEIRO_NAO_PAGO`,
        address: 'Rua Teste',
        number: '2',
        district: 'Centro',
        city: 'Fortaleza',
        state: 'CE',
        zipCode: '60000000',
        userId: user.id,
        restaurantId,
      },
      select: { id: true },
    });

    await prisma.orderItem.create({
      data: {
        orderId: unpaidMoneyOrder.id,
        productId: product.id,
        quantity: 1,
        price,
      },
    });

    const paidPixCancelResult = await cancelOrderAsCustomer(
      baseUrl,
      paidPixOrder.id,
      user.id,
      restaurantId,
      user.email,
    );

    const unpaidMoneyCancelResult = await cancelOrderAsCustomer(
      baseUrl,
      unpaidMoneyOrder.id,
      user.id,
      restaurantId,
      user.email,
    );

    console.log(
      JSON.stringify(
        {
          marker,
          restaurantId,
          paidPixOrderId: paidPixOrder.id,
          unpaidMoneyOrderId: unpaidMoneyOrder.id,
          paidPixCancelResult,
          unpaidMoneyCancelResult,
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
