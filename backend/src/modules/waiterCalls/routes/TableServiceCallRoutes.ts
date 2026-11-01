import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withTenantDbContext, setTenantDbContext } from '../../../database/tenantDbContext.js';
import prisma from '../../../config/prisma.js';
import { decryptNfcPii } from '../../nfcRegistration/security/nfcCustomerPii.js';
import { tableServiceCallEvents } from '../realtime/tableServiceCallEvents.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { nfcRegistrationAccessMiddleware } from '../../../middlewares/nfcRegistrationAccessMiddleware.js';
import { optionalTableSessionAuthMiddleware } from '../../../middlewares/optionalAuthMiddleware.js';
import { sessionMiddleware } from '../../../middlewares/sessionMiddleware.js';
import { tableParticipantMiddleware } from '../../../middlewares/tableParticipantMiddleware.js';
import { waiterMiddleware } from '../../../middlewares/waiterMiddleware.js';
import { premiumTablePlanMiddleware } from '../../../middlewares/premiumTablePlanMiddleware.js';
import { tableServiceCallRateLimitMiddleware } from '../../../middlewares/security/tableSessionRateLimitMiddleware.js';
import CreateTableServiceCallController from '../controllers/CreateTableServiceCallController.js';
import ListTableServiceCallsController from '../controllers/ListTableServiceCallsController.js';
import UpdateTableServiceCallStatusController from '../controllers/UpdateTableServiceCallStatusController.js';
import DeleteTableServiceCallController from '../controllers/DeleteTableServiceCallController.js';

const router = Router();

// NFC calls are independent of QR/table sessions; tenant scope derives
// exclusively from authenticated waiter/admin/attendant identity.
router.get('/nfc', authMiddleware, nfcRegistrationAccessMiddleware, async(req,res)=>{
 try {
  const restaurantId=Number(req.user.restaurantId);
  const calls=await withTenantDbContext(restaurantId,tx=>tx.nfcServiceCall.findMany({
    where:{restaurantId,OR:[{status:{in:['WAITING','IN_PROGRESS']}},{status:'RESOLVED',resolvedAt:{gte:new Date(Date.now()-86400_000)}}]},
    select:{id:true,tableNumber:true,status:true,requestedAt:true,assignedToId:true,assignedTo:{select:{name:true}},resolvedAt:true,
      card:{select:{displayCode:true}},comanda:{select:{customerId:true,customer:{select:{nameEncrypted:true}}}}},
    orderBy:{requestedAt:'asc'},take:200,
  }));
  res.setHeader('Cache-Control','no-store, private');
  return res.json(calls.map(call=>({id:call.id,source:'NFC',cardCode:call.card.displayCode,tableNumber:call.tableNumber,customerName:decryptNfcPii(restaurantId,call.comanda.customerId,'name',call.comanda.customer.nameEncrypted),type:'WAITER',status:call.status,requestedAt:call.requestedAt,assignedToId:call.assignedToId,assignedTo:call.assignedTo,resolvedAt:call.resolvedAt})));
 }catch{return res.status(503).json({error:'Chamados NFC indisponíveis.'});}
});
router.patch('/nfc/:id/status',authMiddleware,nfcRegistrationAccessMiddleware,async(req,res)=>{
 try{
  const id=z.uuid().parse(req.params.id),status=z.enum(['IN_PROGRESS','RESOLVED']).parse(req.body?.status);
  const restaurantId=Number(req.user.restaurantId),actor=Number(req.user.id);
  const updated=await prisma.$transaction(async tx=>{
   await setTenantDbContext(tx,restaurantId);
   const rows=await tx.$queryRaw<Array<{id:string}>>`SELECT "id" FROM "NfcServiceCall" WHERE "id"=${id}::uuid AND "restaurantId"=${restaurantId} FOR UPDATE`;
   if(rows.length!==1)return null;
   const current=await tx.nfcServiceCall.findFirst({where:{id,restaurantId}});
   if(!current)return null;
   if(status==='IN_PROGRESS'&&current.status!=='WAITING')return null;
   if(status==='RESOLVED'&&(current.status!=='IN_PROGRESS'||(String(req.user.role)!=='ADMIN'&&current.assignedToId!==actor)))return null;
   return tx.nfcServiceCall.update({where:{id},data:status==='IN_PROGRESS'?{status,assignedToId:actor,assignedAt:new Date()}:{status,resolvedById:actor,resolvedAt:new Date()}});
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  if(!updated)return res.status(409).json({error:'Chamado indisponível ou alterado por outro funcionário.'});
  try{await tableServiceCallEvents.nfcChanged(restaurantId,id,'updated');}catch(error){console.error('[NFC_ASSISTANCE_REALTIME]',error);}
  return res.json({status:updated.status,id});
 }catch(error){if(error instanceof z.ZodError)return res.status(422).json({error:'Chamado ou status inválido.'});return res.status(503).json({error:'Falha ao atualizar chamado NFC.'});}
});

router.post(
  '/',
  tableServiceCallRateLimitMiddleware,
  optionalTableSessionAuthMiddleware,
  sessionMiddleware,
  premiumTablePlanMiddleware,
  tableParticipantMiddleware,
  (req, res) => CreateTableServiceCallController.handle(req, res),
);

router.get('/', authMiddleware, waiterMiddleware, premiumTablePlanMiddleware, (req, res) =>
  ListTableServiceCallsController.handle(req, res),
);

router.patch(
  '/:id/status',
  authMiddleware,
  waiterMiddleware,
  premiumTablePlanMiddleware,
  (req, res) => UpdateTableServiceCallStatusController.handle(req, res),
);

router.delete('/:id', authMiddleware, waiterMiddleware, premiumTablePlanMiddleware, (req, res) =>
  DeleteTableServiceCallController.handle(req, res),
);

export default router;
