import bcrypt from "bcrypt";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const BASE_PASSWORD = "123456";
const RESTAURANT_SLUG = "pizza-ia-demo";

function isProductionEnvironment() {
  const nodeEnv = String(process.env.NODE_ENV || "")
    .trim()
    .toLowerCase();

  return nodeEnv === "production" || nodeEnv === "prod";
}

function isProdSeedExplicitlyAllowed() {
  const allowSeed = String(process.env.ALLOW_PROD_SEED || "")
    .trim()
    .toLowerCase();

  return allowSeed === "1" || allowSeed === "true" || allowSeed === "yes";
}

async function upsertUser({ email, name, role, restaurantId = null }) {
  const passwordHash = await bcrypt.hash(BASE_PASSWORD, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      active: true,
      password: passwordHash,
      restaurantId,
    },
    create: {
      name,
      email,
      password: passwordHash,
      role,
      active: true,
      restaurantId,
    },
  });
}

async function upsertCategory({ restaurantId, name, description, image }) {
  const existing = await prisma.category.findFirst({
    where: {
      restaurantId,
      name,
    },
    select: { id: true },
  });

  if (existing?.id) {
    return prisma.category.update({
      where: { id: existing.id },
      data: {
        description,
        image,
        active: true,
      },
    });
  }

  return prisma.category.create({
    data: {
      restaurantId,
      name,
      description,
      image,
      active: true,
    },
  });
}

async function upsertProduct({
  restaurantId,
  categoryId,
  name,
  description,
  image,
  price,
  featured = false,
}) {
  const existing = await prisma.product.findFirst({
    where: {
      restaurantId,
      name,
    },
    select: { id: true },
  });

  const baseData = {
    categoryId,
    description,
    image,
    price,
    active: true,
    featured,
    preparationTime: 20,
    stock: 100,
  };

  if (existing?.id) {
    return prisma.product.update({
      where: { id: existing.id },
      data: baseData,
    });
  }

  return prisma.product.create({
    data: {
      restaurantId,
      name,
      ...baseData,
    },
  });
}

async function upsertTable({ restaurantId, number, token }) {
  const existing = await prisma.table.findFirst({
    where: {
      restaurantId,
      number,
    },
    select: { id: true },
  });

  if (existing?.id) {
    return prisma.table.update({
      where: { id: existing.id },
      data: {
        token,
        active: true,
      },
    });
  }

  return prisma.table.create({
    data: {
      restaurantId,
      number,
      token,
      active: true,
    },
  });
}

async function main() {
  if (isProductionEnvironment() && !isProdSeedExplicitlyAllowed()) {
    throw new Error(
      "Seed bloqueado em producao. Defina ALLOW_PROD_SEED=true apenas se realmente quiser executar.",
    );
  }

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: RESTAURANT_SLUG },
    update: {
      name: "Pizza IA Delivery",
      email: "contato@pizzaia.demo",
      phone: "11999990000",
      whatsapp: "11999990000",
      description: "Restaurante de demonstração para desenvolvimento local.",
      city: "Sao Paulo",
      state: "SP",
      active: true,
    },
    create: {
      name: "Pizza IA Delivery",
      slug: RESTAURANT_SLUG,
      email: "contato@pizzaia.demo",
      phone: "11999990000",
      whatsapp: "11999990000",
      cnpj: "11.111.111/0001-11",
      description: "Restaurante de demonstração para desenvolvimento local.",
      city: "Sao Paulo",
      state: "SP",
      active: true,
    },
  });

  await upsertUser({
    email: "superadmin@pizzaia.demo",
    name: "Super Admin",
    role: UserRole.SUPER_ADMIN,
    restaurantId: null,
  });

  const admin = await upsertUser({
    email: "admin@pizzaia.demo",
    name: "Admin Pizza IA",
    role: UserRole.ADMIN,
    restaurantId: restaurant.id,
  });

  await upsertUser({
    email: "funcionario@pizzaia.demo",
    name: "Funcionario Pizza IA",
    role: UserRole.FUNCIONARIO,
    restaurantId: restaurant.id,
  });

  await upsertUser({
    email: "motoqueiro@pizzaia.demo",
    name: "Motoqueiro Pizza IA",
    role: UserRole.MOTOQUEIRO,
    restaurantId: restaurant.id,
  });

  await prisma.restaurantSettings.upsert({
    where: { restaurantId: restaurant.id },
    update: {
      deliveryFee: 5,
      minimumOrder: 20,
      instagram: "https://instagram.com/pizzaia.demo",
      pixKey: "contato@pizzaia.demo",
    },
    create: {
      restaurantId: restaurant.id,
      deliveryFee: 5,
      minimumOrder: 20,
      instagram: "https://instagram.com/pizzaia.demo",
      pixKey: "contato@pizzaia.demo",
    },
  });

  const pizzas = await upsertCategory({
    restaurantId: restaurant.id,
    name: "Pizzas",
    description: "Pizzas tradicionais e especiais",
    image:
      "https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=1200&q=80",
  });

  const bebidas = await upsertCategory({
    restaurantId: restaurant.id,
    name: "Bebidas",
    description: "Refrigerantes e sucos",
    image:
      "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
  });

  const sobremesas = await upsertCategory({
    restaurantId: restaurant.id,
    name: "Sobremesas",
    description: "Doces para finalizar o pedido",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80",
  });

  await upsertProduct({
    restaurantId: restaurant.id,
    categoryId: pizzas.id,
    name: "Pizza Calabresa",
    description: "Molho da casa, mussarela, calabresa e cebola roxa.",
    image:
      "https://images.unsplash.com/photo-1594007654729-407eedc4be65?auto=format&fit=crop&w=1200&q=80",
    price: 49.9,
    featured: true,
  });

  await upsertProduct({
    restaurantId: restaurant.id,
    categoryId: pizzas.id,
    name: "Pizza Margherita",
    description: "Mussarela, tomate fresco, manjericao e azeite extra virgem.",
    image:
      "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=1200&q=80",
    price: 45.9,
  });

  await upsertProduct({
    restaurantId: restaurant.id,
    categoryId: bebidas.id,
    name: "Refrigerante Lata",
    description: "Lata 350ml. Escolha no momento do pedido.",
    image:
      "https://images.unsplash.com/photo-1581636625402-29b2a704ef13?auto=format&fit=crop&w=1200&q=80",
    price: 7,
  });

  await upsertProduct({
    restaurantId: restaurant.id,
    categoryId: sobremesas.id,
    name: "Brownie com Sorvete",
    description: "Brownie artesanal com bola de sorvete de creme.",
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=80",
    price: 18.5,
  });

  for (let number = 1; number <= 8; number += 1) {
    await upsertTable({
      restaurantId: restaurant.id,
      number,
      token: `MESA-${restaurant.id}-${number}`,
    });
  }

  console.log("Seed concluido com sucesso.");
  console.log("Restaurante:", restaurant.name);
  console.log("Admin:", admin.email, "senha:", BASE_PASSWORD);
  console.log(
    "Funcionario:",
    "funcionario@pizzaia.demo",
    "senha:",
    BASE_PASSWORD,
  );
  console.log(
    "Motoqueiro:",
    "motoqueiro@pizzaia.demo",
    "senha:",
    BASE_PASSWORD,
  );
  console.log(
    "Super Admin:",
    "superadmin@pizzaia.demo",
    "senha:",
    BASE_PASSWORD,
  );
}

main()
  .catch((error) => {
    console.error("Erro ao rodar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
