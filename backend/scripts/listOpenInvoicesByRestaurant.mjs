import prisma from "../src/config/prisma.js";

const restaurantId = Number(process.argv[2] || 15);

(async () => {
  try {
    const invoices = await prisma.invoice.findMany({
      where: {
        restaurantId,
        status: {
          in: ["PENDENTE", "ATRASADO"],
        },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
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
