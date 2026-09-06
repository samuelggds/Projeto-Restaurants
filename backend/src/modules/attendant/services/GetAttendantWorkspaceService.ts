import { FuncionarioSubRole, UserRole } from '@prisma/client';
import { withTenantDbContext } from '../../../database/tenantDbContext.js';
import attendantWorkspaceRepository, {
  type AttendantWorkspaceRepository,
} from '../repositories/AttendantWorkspaceRepository.js';

type AttendantActor = {
  restaurantId?: number | null;
  role?: string | null;
  subRole?: string | null;
};

type WorkspaceRepository = Pick<AttendantWorkspaceRepository, 'load'>;
type TenantRunner = typeof withTenantDbContext;

function optionalName(value: unknown) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

export class AttendantWorkspaceAccessError extends Error {}

export class GetAttendantWorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository = attendantWorkspaceRepository,
    private readonly runWithTenant: TenantRunner = withTenantDbContext,
  ) {}

  async execute(actor: AttendantActor, now = new Date()) {
    const role = String(actor.role || '').toUpperCase();
    const subRole = String(actor.subRole || '').toUpperCase();
    const restaurantId = Number(actor.restaurantId || 0);

    if (role !== UserRole.FUNCIONARIO || subRole !== FuncionarioSubRole.ATENDENTE) {
      throw new AttendantWorkspaceAccessError('Área exclusiva para atendentes cadastrados.');
    }
    if (!Number.isSafeInteger(restaurantId) || restaurantId <= 0) {
      throw new AttendantWorkspaceAccessError('Restaurante não identificado para este usuário.');
    }

    const resolvedSince = new Date(now);
    resolvedSince.setHours(0, 0, 0, 0);

    const snapshot = await this.runWithTenant(restaurantId, (db) =>
      this.repository.load(restaurantId, resolvedSince, db),
    );

    return {
      generatedAt: now.toISOString(),
      orders: snapshot.orders.map((order) => ({
        id: order.publicId,
        orderId: order.id,
        code: `#${order.id}`,
        type: order.type,
        status: order.status,
        tableNumber: order.table?.number ?? null,
        customerName: optionalName(order.participant?.displayName || order.user?.name),
        createdAt: order.createdAt.toISOString(),
        readyAt: order.readyAt?.toISOString() ?? null,
        items: order.items.map((item) => ({
          quantity: item.quantity,
          productName: item.product.name,
        })),
      })),
      calls: snapshot.calls.map((call) => ({
        id: String(call.id),
        tableNumber: call.table.number,
        type: call.type,
        status: call.status,
        assignedToId: call.assignedToId ?? null,
        assignedToName: optionalName(call.assignedTo?.name),
        requestedAt: call.requestedAt.toISOString(),
        assignedAt: call.assignedAt?.toISOString() ?? null,
        resolvedAt: call.resolvedAt?.toISOString() ?? null,
      })),
      tables: snapshot.sessions.map((session) => ({
        id: String(session.table.number),
        tableNumber: session.table.number,
        status: session.status,
        openedAt: session.openedAt.toISOString(),
        participantCount: session._count.participants,
        activeOrderCount: session._count.orders,
        activeCallCount: session._count.serviceCalls,
      })),
    };
  }
}

export default new GetAttendantWorkspaceService();
