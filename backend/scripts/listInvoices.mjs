import './_shared/guardSensitiveRead.mjs';
import prisma from '../src/config/prisma.js';

(async () => {
  try {
    const invoices = await prisma.invoice.findMany({});
    console.log('INVOICES:', invoices);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
})();
