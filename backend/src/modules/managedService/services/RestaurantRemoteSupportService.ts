import prisma from '../../../config/prisma.js';
import { realtimePublisher } from '../../../realtime/realtimePublisher.js';
import { managedBadRequest, managedConflict, managedForbidden, managedNotFound } from '../domain/managedServiceErrors.js';

function restaurantId(value: unknown) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw managedBadRequest('Restaurante inválido.');
  return id;
}
const safeRecord = { id: true, restaurantId: true, reason: true, device: true, status: true, requestedAt: true, approvedAt: true, expiresAt: true, closedAt: true } as const;
function notify(id: number) {
  realtimePublisher.to('restaurant:' + id + ':admin').emit('remote-support:changed', { restaurantId: id });
  realtimePublisher.to('super_admin').emit('remote-support:changed', { restaurantId: id });
}
function ensureReason(value: unknown) {
  if (typeof value !== 'string' || value.trim().length < 10 || value.trim().length > 500) throw managedBadRequest('Descreva o motivo em 10 a 500 caracteres.');
  return value.trim();
}
function ensureDevice(value: unknown) {
  if (value !== 'WINDOWS' && value !== 'ANDROID' && value !== 'IOS') throw managedBadRequest('Dispositivo não suportado.');
  return value;
}
export class RestaurantRemoteSupportService {
  async list(idRaw: unknown, userId: number, role: string) {
    const id = restaurantId(idRaw);
    const who = await prisma.user.findFirst({ where: role === 'SUPER_ADMIN' ? { id: userId, role: 'SUPER_ADMIN', active: true } : { id: userId, restaurantId: id, role: 'ADMIN', active: true }, select: { id: true } });
    if (!who) throw managedForbidden('Acesso não autorizado.');
    return prisma.restaurantRemoteSupport.findMany({ where: { restaurantId: id }, select: safeRecord, orderBy: { requestedAt: 'desc' }, take: 10 });
  }

  async request(idRaw: unknown, userId: number, input: unknown) {
    const id = restaurantId(idRaw);
    const record = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {};
    const reason = ensureReason(record.reason);
    const device = ensureDevice(record.device);
    const result = await prisma.$transaction(async db => {
      const actor = await db.user.findFirst({ where: { id: userId, role: 'SUPER_ADMIN', active: true }, select: { id: true } });
      if (!actor) throw managedForbidden('Somente o suporte da plataforma pode solicitar.');
      const restaurant = await db.restaurant.findUnique({ where: { id }, select: { id: true } });
      if (!restaurant) throw managedNotFound('Restaurante não encontrado.');
      const old = await db.restaurantRemoteSupport.findFirst({ where: { restaurantId: id, status: { in: ['PENDING','APPROVED'] } } });
      if (old) {
        if (old.expiresAt > new Date()) throw managedConflict('Já existe uma solicitação ou atendimento vigente.');
        await db.restaurantRemoteSupport.update({ where: { id: old.id }, data: { status: 'EXPIRED' } });
      }
      const created = await db.restaurantRemoteSupport.create({ data: { restaurantId: id, requesterId: actor.id, reason, device, expiresAt: new Date(Date.now() + 15 * 60_000) }, select: safeRecord });
      await db.auditLog.create({ data: { restaurantId: id, userId: actor.id, userRole: 'SUPER_ADMIN', action: 'REMOTE_SUPPORT_REQUESTED', resource: 'RestaurantRemoteSupport:' + created.id, metadata: { device, purpose: 'DEVICE_CONFIGURATION' } } });
      return created;
    });
    notify(id);
    return result;
  }

  async decide(idRaw: unknown, sessionId: string, userId: number, approve: boolean) {
    const id = restaurantId(idRaw);
    const result = await prisma.$transaction(async db => {
      const admin = await db.user.findFirst({ where: { id: userId, restaurantId: id, role: 'ADMIN', active: true }, select: { id: true } });
      if (!admin) throw managedForbidden('Apenas o administrador deste restaurante pode autorizar.');
      const now = new Date();
      const updated = await db.restaurantRemoteSupport.updateMany({ where: { id: sessionId, restaurantId: id, status: 'PENDING', expiresAt: { gt: now } }, data: { status: approve ? 'APPROVED' : 'REJECTED', approverId: admin.id, approvedAt: approve ? now : null, expiresAt: approve ? new Date(now.getTime() + 30 * 60_000) : now, closedAt: approve ? null : now } });
      if (updated.count !== 1) throw managedConflict('A solicitação expirou ou já foi respondida.');
      await db.auditLog.create({ data: { restaurantId: id, userId: admin.id, userRole: 'ADMIN', action: approve ? 'REMOTE_SUPPORT_APPROVED' : 'REMOTE_SUPPORT_REJECTED', resource: 'RestaurantRemoteSupport:' + sessionId } });
      return db.restaurantRemoteSupport.findUniqueOrThrow({ where: { id: sessionId }, select: safeRecord });
    });
    notify(id);
    return result;
  }

  async close(idRaw: unknown, sessionId: string, userId: number, role: string) {
    const id = restaurantId(idRaw);
    const result = await prisma.$transaction(async db => {
      const actor = await db.user.findFirst({ where: role === 'SUPER_ADMIN' ? { id: userId, role: 'SUPER_ADMIN', active: true } : { id: userId, restaurantId: id, role: 'ADMIN', active: true }, select: { id: true, role: true } });
      if (!actor) throw managedForbidden('Sem autorização para encerrar o atendimento.');
      const updated = await db.restaurantRemoteSupport.updateMany({ where: { id: sessionId, restaurantId: id, status: { in: ['PENDING','APPROVED'] } }, data: { status: 'CLOSED', closedAt: new Date(), expiresAt: new Date() } });
      if (updated.count !== 1) throw managedConflict('A sessão já foi encerrada.');
      await db.auditLog.create({ data: { restaurantId: id, userId: actor.id, userRole: actor.role, action: 'REMOTE_SUPPORT_CLOSED', resource: 'RestaurantRemoteSupport:' + sessionId } });
      return db.restaurantRemoteSupport.findUniqueOrThrow({ where: { id: sessionId }, select: safeRecord });
    });
    notify(id);
    return result;
  }
}
export default new RestaurantRemoteSupportService();
