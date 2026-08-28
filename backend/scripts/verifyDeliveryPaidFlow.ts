import './_shared/disabledLegacyScript.mjs';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient, OrderType, PaymentMethod } from '@prisma/client';
import orderRepository from '../src/modules/orders/repositories/OrderRepository.js';
import { generateStrongRandomPassword } from '../src/modules/auth/security/passwordPolicy.js';

const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now();
  const passwordHash = await bcrypt.hash(generateStrongRandomPassword(), 10);

  const restaurant = await prisma.restaurant.create({
    data: {
      name: `Teste Fluxo Delivery ${suffix}`,
      slug: `teste-fluxo-delivery-${suffix}`,
      email: `teste.fluxo.${suffix}@example.com`,
      active: true,
    },
  });

  try {
    const user = await prisma.user.create({
      data: {
        name: `Cliente Teste ${suffix}`,
        email: `cliente.teste.${suffix}@example.com`,
        password: passwordHash,
        role: 'CLIENTE',
        active: true,
        restaurantId: restaurant.id,
      },
    });

    const category = await prisma.category.create({
      data: {
        name: `Categoria Teste ${suffix}`,
        restaurantId: restaurant.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `Pizza Teste ${suffix}`,
        price: 39.9,
        active: true,
        restaurantId: restaurant.id,
        categoryId: category.id,
      },
    });

    const createOrder = async (type: OrderType, paid: boolean) => {
      return prisma.order.create({
        data: {
          total: 39.9,
          type,
          paid,
          paymentMethod: PaymentMethod.PIX,
          userId: user.id,
          restaurantId: restaurant.id,
          address: type === OrderType.DELIVERY ? 'Rua Teste' : null,
          number: type === OrderType.DELIVERY ? '123' : null,
          district: type === OrderType.DELIVERY ? 'Centro' : null,
          city: type === OrderType.DELIVERY ? 'Fortaleza' : null,
          state: type === OrderType.DELIVERY ? 'CE' : null,
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                price: 39.9,
              },
            ],
          },
        },
      });
    };

    const unpaidDelivery = await createOrder(OrderType.DELIVERY, false);
    const unpaidMesa = await createOrder(OrderType.MESA, false);
    const unpaidRetirada = await createOrder(OrderType.RETIRADA, false);

    const beforePayment = await orderRepository.findAll(restaurant.id);
    const beforePaymentIds = new Set(beforePayment.map((o) => Number(o.id)));

    const beforeResult = {
      unpaidDeliveryVisible: beforePaymentIds.has(unpaidDelivery.id),
      unpaidMesaVisible: beforePaymentIds.has(unpaidMesa.id),
      unpaidRetiradaVisible: beforePaymentIds.has(unpaidRetirada.id),
      totalVisible: beforePayment.length,
    };

    await prisma.order.update({
      where: { id: unpaidDelivery.id },
      data: {
        paid: true,
        paidAt: new Date(),
      },
    });

    const afterPayment = await orderRepository.findAll(restaurant.id);
    const afterPaymentIds = new Set(afterPayment.map((o) => Number(o.id)));

    const afterResult = {
      paidDeliveryVisible: afterPaymentIds.has(unpaidDelivery.id),
      unpaidMesaVisible: afterPaymentIds.has(unpaidMesa.id),
      unpaidRetiradaVisible: afterPaymentIds.has(unpaidRetirada.id),
      totalVisible: afterPayment.length,
    };

    console.log('=== RESULTADO TESTE FLUXO DELIVERY ===');
    console.log(JSON.stringify({ beforeResult, afterResult }, null, 2));

    const passed =
      beforeResult.unpaidDeliveryVisible === false &&
      beforeResult.unpaidMesaVisible === true &&
      beforeResult.unpaidRetiradaVisible === true &&
      afterResult.paidDeliveryVisible === true &&
      afterResult.unpaidMesaVisible === true &&
      afterResult.unpaidRetiradaVisible === true;

    if (!passed) {
      process.exitCode = 1;
      console.error('FALHOU: o comportamento nao bate com a regra esperada.');
      return;
    }

    console.log('PASSOU: DELIVERY entra so apos pagamento; MESA/RETIRADA entram normalmente.');
  } finally {
    await prisma.restaurant.delete({
      where: { id: restaurant.id },
    });
  }
}

main()
  .catch((error) => {
    console.error('Erro ao executar teste:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
