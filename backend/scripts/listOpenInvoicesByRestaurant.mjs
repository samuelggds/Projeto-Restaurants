import 'dotenv/config';
import './_shared/guardSensitiveRead.mjs';
import prisma from '../src/config/prisma.js';

const restaurantId = Number(process.argv[2] || 0);

(async () => {
  try {
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      throw new Error(
        'Informe o restaurantId como primeiro argumento. Ex.: npm --prefix backend exec node backend/scripts/listOpenInvoicesByRestaurant.mjs 1',
      );
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        restaurantId,
        status: {
          in: ['PENDENTE', 'ATRASADO'],
        },
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        month: true,
        year: true,
        status: true,
        dueDate: true,
        paymentLink: true,
      },
    });

    console.log(JSON.stringify({ restaurantId, invoices }, null, 2));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
