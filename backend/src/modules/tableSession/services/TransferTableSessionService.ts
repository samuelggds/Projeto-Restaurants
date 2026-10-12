import { Prisma, TableSessionStatus } from '@prisma/client';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext } from '../../../database/tenantDbContext.js';
import { lockTablePaymentSession } from '../../tableAccount/services/tablePaymentLedger.js';
import { tableSessionEvents } from '../realtime/tableSessionEvents.js';

export class TableTransferError extends Error {
  constructor(message: string, public readonly statusCode = 409) { super(message); }
}
function positive(value: unknown) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new TableTransferError('Identificador inválido.',422);
  return n;
}
export class TransferTableSessionService {
  async execute(input: {sessionId: unknown; destinationTableId: unknown; restaurantId: unknown; actorId: unknown}) {
    const restaurantId = positive(input.restaurantId);
    const sessionId = positive(input.sessionId);
    const destinationTableId = positive(input.destinationTableId);
    const actorId = positive(input.actorId);
    try {
      const result = await prisma.$transaction(async tx => {
        await setTenantDbContext(tx,restaurantId);
        await lockTablePaymentSession(tx,restaurantId,sessionId);
        const session = await tx.tableSession.findFirst({
          where: {id:sessionId,restaurantId,status:{in:[TableSessionStatus.OPEN,TableSessionStatus.CLOSING_REQUESTED]},
            OR:[{expiresAt:null},{expiresAt:{gt:new Date()}}]},
          select: {id:true,tableId:true,expiresAt:true,publicId:true},
        });
        if(!session) throw new TableTransferError('Sessão não encontrada, expirada ou fechada.',404);
        if(session.tableId===destinationTableId) throw new TableTransferError('Selecione outra mesa.',422);
        const tableIds=[session.tableId,destinationTableId].sort((a,b)=>a-b);
        const locked=await tx.$queryRaw<Array<{id:number;number:number;active:boolean;token:string}>>(
          Prisma.sql`SELECT "id","number","active","token" FROM "Table" WHERE "restaurantId"=${restaurantId}
            AND "id" IN (${Prisma.join(tableIds)}) ORDER BY "id" FOR UPDATE`);
        const source=locked.find(t=>t.id===session.tableId);
        const destination=locked.find(t=>t.id===destinationTableId);
        if(!source||!destination||!destination.active) throw new TableTransferError('Mesa destino inexistente, inativa ou de outro restaurante.',404);
        const occupied=await tx.tableSession.findFirst({
          where:{restaurantId,tableId:destinationTableId,status:{in:[TableSessionStatus.OPEN,TableSessionStatus.CLOSING_REQUESTED]}},
          select:{id:true},
        });
        if(occupied) throw new TableTransferError('A mesa destino já possui sessão aberta.');
        const reservation=await tx.tableReservation.findFirst({
          where:{restaurantId,tableId:destinationTableId,status:'CONFIRMED',
            startsAt:{lt:session.expiresAt||new Date(Date.now()+12*60*60*1000)},endsAt:{gt:new Date()}},
          select:{id:true},
        });
        if(reservation) throw new TableTransferError('A mesa destino possui reserva confirmada neste período.');
        const update=await tx.tableSession.updateMany({
          where:{id:sessionId,restaurantId,tableId:source.id,status:{in:[TableSessionStatus.OPEN,TableSessionStatus.CLOSING_REQUESTED]}},
          data:{tableId:destination.id},
        });
        if(update.count!==1) throw new TableTransferError('A sessão foi alterada. Atualize a tela.');
        await tx.order.updateMany({where:{restaurantId,tableSessionId:sessionId,tableId:source.id},data:{tableId:destination.id}});
        await tx.tableServiceCall.updateMany({where:{restaurantId,tableSessionId:sessionId,tableId:source.id},data:{tableId:destination.id}});
        await tx.tableAccessRequest.updateMany({where:{restaurantId,tableSessionId:sessionId,tableId:source.id},data:{tableId:destination.id}});
        await tx.tableSessionTransfer.create({data:{restaurantId,tableSessionId:sessionId,fromTableId:source.id,toTableId:destination.id,transferredById:actorId}});
        const restaurant=await tx.restaurant.findUnique({where:{id:restaurantId},select:{slug:true}});
        if(!restaurant) throw new TableTransferError('Restaurante não encontrado.',404);
        return {restaurantId,sessionId,sessionPublicId:session.publicId,fromTableId:source.id,
          fromTableNumber:source.number,tableId:destination.id,tableNumber:destination.number,
          destinationTableToken:destination.token,restaurantSlug:restaurant.slug};
      },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      tableSessionEvents.transferred(result).catch(error=>
        console.error('[TABLE_TRANSFER_REALTIME_ERROR]',error instanceof Error?error.message:String(error)));
      const {destinationTableToken: _token, restaurantSlug: _slug,...safe}=result;
      void _token;void _slug;
      return safe;
    } catch(error) {
      if(error instanceof TableTransferError) throw error;
      if(error&&typeof error==='object'&&'code' in error&&['P2002','P2034','P2003'].includes(String(error.code)))
        throw new TableTransferError('Outra operação alterou a mesa. Atualize e tente novamente.');
      throw error;
    }
  }
}
export default new TransferTableSessionService();
