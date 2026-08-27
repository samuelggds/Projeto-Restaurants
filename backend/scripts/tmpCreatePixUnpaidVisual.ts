import './_shared/disabledLegacyScript.mjs';
import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

import prisma from '../src/config/prisma.js';
import { OrderStatus, OrderType, PaymentMethod, UserRole } from '@prisma/client';

async function main() {
  const courier = await prisma.user.findFirst({
    where: { email: 'motoqueiro@pizzaia.demo' },
    select: { restaurantId: true },
  });

  if (!courier?.restaurantId) {
    throw new Error('Motoqueiro nao encontrado');
  }

  const restaurantId = courier.restaurantId;

  let customer = await prisma.user.findFirst({
    where: { restaurantId, role: UserRole.CLIENTE, active: true },
    select: { id: true, phone: true },
    orderBy: { id: 'asc' },
  });

  if (!customer) {
    customer = await prisma.user.create({
      data: {
        name: 'Cliente Pix Pendente',
        email: `cliente.pixpend.${Date.now()}@pizzaia.demo`,
        password: '123456',
        role: UserRole.CLIENTE,
        active: true,
        phone: '+5585999998888',
        restaurantId,
      },
      select: { id: true, phone: true },
    });
  }

  const product = await prisma.product.findFirst({
    where: { restaurantId, active: true },
    select: { id: true, price: true },
    orderBy: { id: 'asc' },
  });

  if (!product) {
    throw new Error('Produto nao encontrado');
  }

  const order = await prisma.order.create({
    data: {
      total: Number(product.price),
      status: OrderStatus.SAIU_PARA_ENTREGA,
      type: OrderType.DELIVERY,
      paymentMethod: PaymentMethod.PIX,
      paid: false,
      paidAt: null,
      address: 'Rua PIX Pendente',
      number: '55',
      district: 'Centro',
      city: 'Fortaleza',
      state: 'CE',
      zipCode: '60000000',
      observation: `VISUAL_PIX_NAO_PAGO_${Date.now()}`,
      userId: customer.id,
      restaurantId,
      items: {
        create: [
          {
            productId: product.id,
            quantity: 1,
            price: Number(product.price),
          },
        ],
      },
    },
    select: { id: true, paid: true, paymentMethod: true },
  });

  const code = String(customer.phone || '')
    .replace(/\D/g, '')
    .slice(-4);

  console.log(JSON.stringify({ order, code }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
