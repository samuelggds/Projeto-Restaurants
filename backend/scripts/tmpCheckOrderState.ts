import dotenv from "dotenv";
dotenv.config({ path: "backend/.env" });

import prisma from "../src/config/prisma.js";

async function main() {
  const orderIdArg = process.argv[2];
  const orderId = Number(orderIdArg || 0);

  if (!orderId) {
    throw new Error("Informe o id do pedido. Exemplo: tsx script.ts 31");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      paid: true,
      paidAt: true,
      paymentMethod: true,
      payOnDelivery: true,
      payOnDeliveryMethod: true,
      user: {
        select: {
          phone: true,
          name: true,
        },
      },
    },
  });

  console.log(JSON.stringify(order, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
