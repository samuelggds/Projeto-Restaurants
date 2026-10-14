import prisma from '../../../config/prisma.js';

/**
 * Customer credentials are restaurant-bound. A slug is resolved using the
 * server-side Restaurant table, never accepted as an asserted tenant id.
 */
export async function resolveCustomerRestaurantId(restaurantSlug: string | undefined) {
  const slug = String(restaurantSlug || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug))
    throw new Error('Acesse o cadastro ou login pelo endereço do restaurante.');

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug }, select: { id: true, active: true },
  });
  if (!restaurant?.active)
    throw new Error('Restaurante não encontrado ou indisponível.');
  return restaurant.id;
}

type CustomerAccount = { id: number; role: string; restaurantId: number | null; authVersion: number; active: boolean };

/**
 * One-time legacy reconciliation after a verified credential (password or
 * Google ID token). A historical account is NEVER linked to another tenant
 * when it has registration evidence or orders for a different restaurant.
 *
 * CAS + authVersion increment prevents racing logins from claiming different
 * restaurants, and revokes any old global access/refresh tokens.
 */
export async function assertCustomerRestaurantAccess<T extends CustomerAccount>(
  account: T, restaurantSlug: string | undefined,
): Promise<T> {
  if (account.role !== 'CLIENTE') return account;
  const restaurantId = await resolveCustomerRestaurantId(restaurantSlug);
  if (account.restaurantId !== null) {
    if (account.restaurantId !== restaurantId)
      throw new Error('Esta conta pertence a outro restaurante. Entre com a conta cadastrada neste restaurante.');
    return account;
  }

  const [orders, verification] = await Promise.all([
    prisma.order.findMany({
      where: { userId: account.id },
      select: { restaurantId: true },
      distinct: ['restaurantId'],
      take: 2,
    }),
    prisma.emailVerificationToken.findUnique({
      where: { userId: account.id },
      select: { restaurantSlug: true },
    }),
  ]);
  if ((!verification?.restaurantSlug && orders.length === 0)
    || (verification?.restaurantSlug && verification.restaurantSlug !== String(restaurantSlug || '').trim().toLowerCase())
    || orders.some((order) => order.restaurantId !== restaurantId))
    throw new Error('A conta antiga possui vínculo com outro restaurante. Solicite a regularização da conta.');

  const linked = await prisma.user.updateMany({
    where: { id: account.id, role: 'CLIENTE', restaurantId: null, active: true, authVersion: account.authVersion },
    data: { restaurantId, authVersion: { increment: 1 } },
  });
  const current = await prisma.user.findUnique({ where: { id: account.id } });
  if (!current?.active || current.restaurantId !== restaurantId || current.role !== 'CLIENTE' ||
      (linked.count === 0 && current.authVersion !== account.authVersion + 1))
    throw new Error('Não foi possível confirmar o restaurante desta conta.');
  // Preserve the precise caller shape while updating the two fields changed
  // during the atomic legacy reconciliation, rather than casting Prisma.User to T.
  return { ...account, restaurantId, authVersion: current.authVersion };
}
