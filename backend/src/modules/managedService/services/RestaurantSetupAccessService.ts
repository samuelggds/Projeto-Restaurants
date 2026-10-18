import prisma from '../../../config/prisma.js';
import { realtimePublisher } from '../../../realtime/realtimePublisher.js';
import { managedBadRequest, managedConflict, managedForbidden, managedNotFound } from '../domain/managedServiceErrors.js';

const MAX_HOURS = 24;
const active = (row: { status: string; expiresAt: Date | null }) =>
  row.status === 'APPROVED' && row.expiresAt !== null && row.expiresAt > new Date();

async function audit(db: Parameters<Parameters<typeof prisma.$transaction>[0]>[0], restaurantId: number, userId: number, action: string, id: string) {
  await db.auditLog.create({ data: { restaurantId, userId, action, resource: 'RestaurantSetupAccess:' + id, metadata: { scope: 'OPERATIONAL_SETUP' } } });
}

function validId(id: unknown) {
  const n = Number(id);
  if (!Number.isSafeInteger(n) || n < 1) throw managedBadRequest('Restaurante inválido.');
  return n;
}

export class RestaurantSetupAccessService {
  async request(restaurantIdRaw: unknown, actorId: number, reasonRaw: unknown) {
    const restaurantId = validId(restaurantIdRaw);
    const reason = String(reasonRaw || '').trim().slice(0, 500);
    if (reason.length < 10) throw managedBadRequest('Informe o motivo do acesso (mínimo 10 caracteres).');
    const grant = await prisma.$transaction(async (db) => {
      const actor = await db.user.findFirst({ where: { id: actorId, role: 'SUPER_ADMIN', active: true }, select: { id: true } });
      if (!actor) throw managedForbidden('Apenas o responsável da plataforma pode solicitar acesso.');
      const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { id: true } });
      if (!restaurant) throw managedNotFound('Restaurante não encontrado.');
      const current = await db.restaurantSetupAccess.findFirst({ where: { restaurantId, status: { in: ['PENDING', 'APPROVED'] } } });
      if (current) {
        if (current.status === 'PENDING' || active(current)) throw managedConflict('Já existe uma autorização pendente ou vigente.');
        await db.restaurantSetupAccess.update({ where: { id: current.id }, data: { status: 'EXPIRED' } });
      }
      const created = await db.restaurantSetupAccess.create({ data: { restaurantId, requesterId: actor.id, reason } });
      await audit(db, restaurantId, actor.id, 'SETUP_ACCESS_REQUESTED', created.id);
      return created;
    });
    realtimePublisher.to('restaurant:' + restaurantId + ':admin').emit('setup-access:changed', { restaurantId });
    return grant;
  }

  async decide(actorId: number, restaurantIdRaw: unknown, id: string, approve: boolean, hours = 2) {
    const restaurantId = validId(restaurantIdRaw);
    if (approve && (!Number.isInteger(hours) || hours < 1 || hours > MAX_HOURS)) throw managedBadRequest('Duração permitida: 1 a 24 horas.');
    const result = await prisma.$transaction(async (db) => {
      const actor = await db.user.findFirst({ where: { id: actorId, restaurantId, role: 'ADMIN', active: true }, select: { id: true } });
      if (!actor) throw managedForbidden('Somente o administrador deste restaurante pode autorizar.');
      const grant = await db.restaurantSetupAccess.findFirst({ where: { id, restaurantId } });
      if (!grant || grant.status !== 'PENDING') throw managedConflict('Solicitação não está pendente.');
      const result = await db.restaurantSetupAccess.updateMany({
        where: { id, restaurantId, status: 'PENDING' },
        data: { status: approve ? 'APPROVED' : 'REJECTED', decidedById: actor.id, approvedAt: approve ? new Date() : null, expiresAt: approve ? new Date(Date.now() + hours * 3_600_000) : null },
      });
      if (result.count !== 1) throw managedConflict('A solicitação já foi decidida.');
      await audit(db, restaurantId, actor.id, approve ? 'SETUP_ACCESS_APPROVED' : 'SETUP_ACCESS_REJECTED', id);
      return db.restaurantSetupAccess.findUniqueOrThrow({ where: { id } });
    });
    realtimePublisher.to('super_admin').emit('setup-access:changed', { restaurantId });
    realtimePublisher.to('restaurant:' + restaurantId + ':admin').emit('setup-access:changed', { restaurantId });
    return result;
  }

  async revoke(actorId: number, restaurantIdRaw: unknown, id: string) {
    const restaurantId = validId(restaurantIdRaw);
    const result = await prisma.$transaction(async (db) => {
      const actor = await db.user.findFirst({ where: { id: actorId, restaurantId, role: 'ADMIN', active: true }, select: { id: true } });
      if (!actor) throw managedForbidden('Somente o administrador pode revogar.');
      const updated = await db.restaurantSetupAccess.updateMany({ where: { id, restaurantId, status: { in: ['APPROVED', 'PENDING'] } }, data: { status: 'REVOKED', revokedAt: new Date(), decidedById: actor.id } });
      if (updated.count !== 1) throw managedConflict('Autorização já encerrada.');
      await audit(db, restaurantId, actor.id, 'SETUP_ACCESS_REVOKED', id);
      return db.restaurantSetupAccess.findUniqueOrThrow({ where: { id } });
    });
    realtimePublisher.to('super_admin').emit('setup-access:changed', { restaurantId });
    realtimePublisher.to('restaurant:' + restaurantId + ':admin').emit('setup-access:changed', { restaurantId });
    return result;
  }

  async list(restaurantIdRaw: unknown, actorId: number, role: string) {
    const restaurantId = validId(restaurantIdRaw);
    const actor = await prisma.user.findFirst({ where: role === 'SUPER_ADMIN' ? { id: actorId, role: 'SUPER_ADMIN', active: true } : { id: actorId, role: 'ADMIN', restaurantId, active: true }, select: { id: true } });
    if (!actor) throw managedForbidden('Sem permissão para consultar as autorizações.');
    return prisma.restaurantSetupAccess.findMany({ where: { restaurantId }, orderBy: { requestedAt: 'desc' }, take: 20, select: { id: true, restaurantId: true, status: true, reason: true, requestedAt: true, approvedAt: true, expiresAt: true, revokedAt: true, requesterId: true, decidedById: true } });
  }

  async assertAuthorized(restaurantIdRaw: unknown, actorId: number) {
    const restaurantId = validId(restaurantIdRaw);
    const actor = await prisma.user.findFirst({ where: { id: actorId, role: 'SUPER_ADMIN', active: true }, select: { id: true } });
    if (!actor) throw managedForbidden('Identidade de plataforma inválida.');
    const grant = await prisma.restaurantSetupAccess.findFirst({ where: { restaurantId, requesterId: actor.id, status: 'APPROVED', revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
    if (!grant) throw managedForbidden('O administrador ainda não autorizou este acesso ou ele expirou.', 'SETUP_ACCESS_CONSENT_REQUIRED');
    return grant.id;
  }
}

export default new RestaurantSetupAccessService();
