import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

import prisma from '../src/config/prisma.js';
import updateOrderStatusService from '../src/modules/orders/services/UpdateOrderStatusService.js';
import { PaymentMethod, OrderStatus, OrderType } from '@prisma/client';

async function ensureBaseData() {
  const courier = await prisma.user.findFirst({
    where: { email: 'motoqueiro@pizzaia.demo' },
    select: { id: true, restaurantId: true },
  });

  if (!courier?.restaurantId) {
    throw new Error('Motoqueiro de teste nao encontrado. Rode o seed e tente novamente.');
  }

  const restaurantId = courier.restaurantId;

  let customer = await prisma.user.findFirst({
    where: { restaurantId, role: 'CLIENTE', active: true },
    select: { id: true, phone: true },
    orderBy: { id: 'asc' },
  });

  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: 'Cliente Teste Fluxo',
        email: `cliente.teste.fluxo.${Date.now()}@pizzaia.demo`,
        password: '123456',
        role: 'CLIENTE',
        active: true,
        phone: '+5585999998888',
        restaurantId,
      },
      select: { id: true, phone: true },
    });
  }

  if (!customer.phone) {
    await prisma.user.update({
      where: { id: customer.id },
      data: { phone: '+5585999998888' },
    });
    customer = { ...customer, phone: '+5585999998888' };
  }

  let category = await prisma.category.findFirst({
    where: { restaurantId },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        name: `Categoria Teste ${Date.now()}`,
        restaurantId,
      },
      select: { id: true },
    });
  }

  let product = await prisma.product.findFirst({
    where: { restaurantId, active: true },
    select: { id: true, price: true },
    orderBy: { id: 'asc' },
  });

  if (!product) {
    product = await prisma.product.create({
      data: {
        name: `Produto Teste Fluxo ${Date.now()}`,
        description: 'Produto teste para fluxo de entrega',
        price: 39.9,
        active: true,
        restaurantId,
        categoryId: category.id,
      },
      select: { id: true, price: true },
    });
  }

  return {
    courierId: courier.id,
    restaurantId,
    customerId: customer.id,
    customerPhone: String(customer.phone),
    productId: product.id,
    productPrice: Number(product.price),
  };
}

async function createOrder({
  restaurantId,
  customerId,
  productId,
  productPrice,
  paymentMethod,
  paid,
  tag,
}: {
  restaurantId: number;
  customerId: number;
  productId: number;
  productPrice: number;
  paymentMethod: PaymentMethod;
  paid: boolean;
  tag: string;
}) {
  return prisma.order.create({
    data: {
      total: productPrice,
      status: OrderStatus.SAIU_PARA_ENTREGA,
      type: OrderType.DELIVERY,
      paymentMethod,
      paid,
      paidAt: paid ? new Date() : null,
      observation: `TMP_TEST_${tag}_${Date.now()}`,
      address: 'Rua Teste',
      number: '123',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60000000',
      userId: customerId,
      restaurantId,
      items: {
        create: [
          {
            productId,
            quantity: 1,
            price: productPrice,
          },
        ],
      },
    },
    select: { id: true },
  });
}

async function testCase({
  label,
  paymentMethod,
  paid,
  expectedSuccess,
  restaurantId,
  customerId,
  productId,
  productPrice,
  code,
}: {
  label: string;
  paymentMethod: PaymentMethod;
  paid: boolean;
  expectedSuccess: boolean;
  restaurantId: number;
  customerId: number;
  productId: number;
  productPrice: number;
  code: string;
}) {
  const order = await createOrder({
    restaurantId,
    customerId,
    productId,
    productPrice,
    paymentMethod,
    paid,
    tag: label,
  });

  try {
    const updated = await updateOrderStatusService.execute(
      order.id,
      restaurantId,
      OrderStatus.ENTREGUE,
      'MOTOQUEIRO',
      code,
    );

    const ok = expectedSuccess === true;
    return {
      label,
      orderId: order.id,
      paymentMethod,
      paidBefore: paid,
      success: true,
      expectedSuccess,
      statusAfter: updated?.status,
      paidAfter: updated?.paid,
      result: ok ? 'PASS' : 'FAIL_UNEXPECTED_SUCCESS',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const ok = expectedSuccess === false;
    return {
      label,
      orderId: order.id,
      paymentMethod,
      paidBefore: paid,
      success: false,
      expectedSuccess,
      error: message,
      result: ok ? 'PASS' : 'FAIL_UNEXPECTED_ERROR',
    };
  }
}

async function main() {
  const base = await ensureBaseData();
  const last4 = String(base.customerPhone).replace(/\D/g, '').slice(-4);

  const results = [];

  results.push(
    await testCase({
      label: 'DINHEIRO_NAO_PAGO',
      paymentMethod: PaymentMethod.DINHEIRO,
      paid: false,
      expectedSuccess: true,
      ...base,
      code: last4,
    }),
  );

  results.push(
    await testCase({
      label: 'PIX_NAO_PAGO',
      paymentMethod: PaymentMethod.PIX,
      paid: false,
      expectedSuccess: false,
      ...base,
      code: last4,
    }),
  );

  results.push(
    await testCase({
      label: 'CARTAO_NAO_PAGO',
      paymentMethod: PaymentMethod.CARTAO,
      paid: false,
      expectedSuccess: false,
      ...base,
      code: last4,
    }),
  );

  console.log(
    JSON.stringify(
      {
        testedWithCode: last4,
        customerPhone: base.customerPhone,
        results,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
