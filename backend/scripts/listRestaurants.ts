import 'dotenv/config';
import prisma from '../src/config/prisma.js';

(async () => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      select: {
        id: true,
        name: true,
        active: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    console.log(JSON.stringify(restaurants, null, 2));
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
