import './_shared/guardSensitiveRead.mjs';
import prisma from '../src/config/prisma.js';

(async () => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        restaurantId: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log('ADMINS:', JSON.stringify(admins, null, 2));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
