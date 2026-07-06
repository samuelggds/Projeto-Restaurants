import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

const email = process.argv[2] || "admin@hotmail.com";
const password = process.argv[3] || "123456";

(async () => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        active: true,
        restaurantId: true,
        password: true,
      },
    });

    if (!user) {
      console.log("USER_NOT_FOUND");
      return;
    }

    const looksHashed = String(user.password || "").startsWith("$2");
    const passwordMatches = await bcrypt.compare(password, user.password || "");

    console.log(
      JSON.stringify(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          active: user.active,
          restaurantId: user.restaurantId,
          looksHashed,
          passwordMatches,
          passwordLength: user.password?.length || 0,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
