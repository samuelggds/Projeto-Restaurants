import 'dotenv/config';
import { PrismaClient, OrderType, PaymentMethod } from '@prisma/client';
import orderRepository from '../src/modules/orders/repositories/OrderRepository.js';

const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now();

  const restaurant = await prisma.restaurant.create({
    data: {
      name: `Teste Sample Pedido ${suffix}`,
      slug: `teste-sample-pedido-${suffix}`,
      email: `sample.pedido.${suffix}@example.com`,
      active: true,
    },
  });

  try {
    const user = await prisma.user.create({
      data: {
        name: `Cliente Sample ${suffix}`,
        email: `cliente.sample.${suffix}@example.com`,
        password: '123456',
        role: 'CLIENTE',
        active: true,
        restaurantId: restaurant.id,
      },
    });

    const category = await prisma.category.create({
      data: {
        name: `Categoria Sample ${suffix}`,
        restaurantId: restaurant.id,
      },
    });

    const product = await prisma.product.create({
      data: {
        name: `Pizza Sample ${suffix}`,
        price: 42.5,
        active: true,
        restaurantId: restaurant.id,
        categoryId: category.id,
      },
    });

    const createDelivery = async (paid: boolean) => {
      return prisma.order.create({
        data: {
          total: 42.5,
          type: OrderType.DELIVERY,
          paymentMethod: PaymentMethod.PIX,
          paid,
          paidAt: paid ? new Date() : null,
          userId: user.id,
          restaurantId: restaurant.id,
          address: 'Rua Exemplo',
          number: '100',
          district: 'Centro',
          city: 'Fortaleza',
          state: 'CE',
          zipCode: '60000000',
          items: {
            create: [
              {
                productId: product.id,
                quantity: 1,
                price: 42.5,
              },
            ],
          },
        },
      });
    };

    const unpaidOrder = await createDelivery(false);
    const paidOrder = await createDelivery(true);

    const visibleOrders = await orderRepository.findAll(restaurant.id);
    const visibleOrderIds = new Set(visibleOrders.map((order) => Number(order.id)));

    const [unpaidOrderFull, paidOrderFull] = await Promise.all([
      prisma.order.findUnique({
        where: { id: unpaidOrder.id },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.order.findUnique({
        where: { id: paidOrder.id },
        include: {
          items: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    console.log('=== PEDIDO NAO PAGO ===');
    console.log(
      JSON.stringify(
        {
          ...unpaidOrderFull,
          appearsInAdminEmployeeFlow: visibleOrderIds.has(unpaidOrder.id),
        },
        null,
        2,
      ),
    );

    console.log('=== PEDIDO PAGO ===');
    console.log(
      JSON.stringify(
        {
          ...paidOrderFull,
          appearsInAdminEmployeeFlow: visibleOrderIds.has(paidOrder.id),
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          restaurantId: restaurant.id,
        },
      },
    });

    await prisma.order.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.product.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.category.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.user.deleteMany({
      where: {
        restaurantId: restaurant.id,
      },
    });

    await prisma.restaurant.delete({
      where: {
        id: restaurant.id,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error('Erro ao gerar pedidos de exemplo:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
