import 'dotenv/config';
import promptSync from 'prompt-sync';
import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const prompt = promptSync({ sigint: true });

async function createSuperAdmin() {
  try {
    console.log('\n===================================');
    console.log(' CRIAÇÃO DO SUPER ADMIN');
    console.log('===================================\n');

    const exists = await prisma.user.findFirst({
      where: {
        role: UserRole.SUPER_ADMIN,
      },
    });

    if (exists) {
      console.log('Já existe um SUPER_ADMIN cadastrado!');
      return;
    }

    const name = String(prompt('Nome: ') || '').trim();
    const email = String(prompt('Email: ') || '')
      .trim()
      .toLowerCase();
    const password = String(prompt('Senha: ') || '').trim();

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashPassword,
        role: UserRole.SUPER_ADMIN,
        active: true,
      },
    });

    console.log('\n✅ SUPER ADMIN criado com sucesso!');
    console.log({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();
