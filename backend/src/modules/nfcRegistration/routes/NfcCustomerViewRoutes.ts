import crypto from 'node:crypto';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';
import { decryptNfcPii } from '../security/nfcCustomerPii.js';
import { nextNfcReturnCpfFailure } from '../domain/nfcReturnCpfLockout.js';
import { hasNfcCardAccess } from '../../billing/domain/planFeaturePolicy.js';
import { verifyNfcCustomerCpfPrefix, nfcCustomerSessionHash } from '../domain/nfcCustomerViewVerification.js';

const router=Router();
const tokenPattern=/^[A-Za-z0-9_-]{32,128}$/u;
const sessionPattern=/^[A-Za-z0-9_-]{43}$/u;
const verify=z.strictObject({token:z.string().regex(tokenPattern),cpfPrefix:z.string().regex(/^\d{3}$/u)});
const sessionLife=15*60_000;
// Customer read-only sessions have a short lifetime; all reads revalidate the active card and visit.
const hash=(text:string)=>crypto.createHash('sha256').update(text).digest('hex');
function noStore(res:import('express').Response){res.setHeader('Cache-Control','no-store, private');res.setHeader('Pragma','no-cache');res.setHeader('Referrer-Policy','no-referrer');}
function genericError(res:import('express').Response,status=403){noStore(res);return res.status(status).json({error:'Não foi possível confirmar a visita. Confira o cartão, CPF e situação da comanda.'});}
async function activeVisit(token:string){
 const tokenHash=hash(token);
 // The NFC token is never a credential for viewing personal data.
 const card=await prisma.nfcCard.findFirst({
   where:{tokenHash,status:'ACTIVE',customerId:{not:null}},
   select:{id:true,customerId:true,restaurantId:true,failedGuestViewAttempts:true,guestViewLockedUntil:true},
 });
 if(!card?.customerId)return null;
 return {card,tokenHash};
}
// A card only resolves the restaurant's public login slug. It never grants
// access to the staff panel or reveals the linked customer or visit.
const cardContextSchema=z.strictObject({token:z.string().regex(tokenPattern),restaurantSlug:z.string().regex(/^[a-z0-9][a-z0-9_-]{0,99}$/u).optional()});
router.post('/card-context',async(req,res)=>{
  try{
    const {token,restaurantSlug}=cardContextSchema.parse(req.body);
    const tokenHash=hash(token);
    // Look up the opaque token first, then validate the card in its RLS context.
    const card=await prisma.nfcCard.findUnique({
      where:{tokenHash},select:{id:true,restaurantId:true},
    });
    if(!card)return genericError(res,404);
    const slug=await withTenantDbContext(card.restaurantId,async tx=>{
      const current=await tx.nfcCard.findFirst({
        where:{id:card.id,restaurantId:card.restaurantId,tokenHash,
          status:{in:['PENDING_WRITE','READY','ACTIVE']}},
        select:{id:true},
      });
      if(!current)return null;
      const restaurant=await tx.restaurant.findFirst({
        where:{id:card.restaurantId,active:true},select:{slug:true},
      });
      return restaurant?.slug||null;
    });
    if(!slug || (restaurantSlug && restaurantSlug !== slug))return genericError(res,404);
    noStore(res);
    return res.json({restaurantSlug:slug});
  }catch(error){
    if(error instanceof z.ZodError)return genericError(res,422);
    return genericError(res,503);
  }
});
router.post('/verify',async(req,res)=>{
 try{
   const input=verify.parse(req.body);
   const resolved=await activeVisit(input.token);
   if(!resolved)return genericError(res);
   const {card}=resolved;
   const subscription=await prisma.subscription.findUnique({where:{restaurantId:card.restaurantId},select:{plan:true,status:true,restaurant:{select:{active:true,accessBlockReason:true,billingTemporaryAccessUntil:true}}}});
   if(!hasNfcCardAccess(subscription?.plan,subscription?.status,subscription?.restaurant))return genericError(res);
   const result=await prisma.$transaction(async tx=>{
     await setTenantDbContext(tx,card.restaurantId);
     // Lock card first so simultaneous wrong CPFs cannot bypass lockout.
     await tx.$queryRaw`SELECT "id" FROM "NfcCard" WHERE "restaurantId"=${card.restaurantId} AND "id"=${card.id}::uuid FOR UPDATE`;
     const current=await tx.nfcCard.findFirst({where:{id:card.id,restaurantId:card.restaurantId,status:'ACTIVE',customerId:card.customerId},select:{
       id:true,customerId:true,failedGuestViewAttempts:true,guestViewLockedUntil:true,
     }});
     if(!current?.customerId)return null;
     if(current.guestViewLockedUntil&&current.guestViewLockedUntil>new Date())return {blocked:true as const};
     const customer=await tx.nfcCustomer.findFirst({where:{id:current.customerId,restaurantId:card.restaurantId},select:{cpfEncrypted:true}});
     const comanda=await tx.nfcComanda.findFirst({
       where:{restaurantId:card.restaurantId,customerId:current.customerId,cardId:card.id,status:'OPEN'},
       select:{id:true},orderBy:{openedAt:'desc'},
     });
     if(!customer||!comanda)return null;
     if(!verifyNfcCustomerCpfPrefix(decryptNfcPii(card.restaurantId,current.customerId,'cpf',customer.cpfEncrypted),input.cpfPrefix)){
       const failure=nextNfcReturnCpfFailure(current.failedGuestViewAttempts,new Date());
       await tx.nfcCard.updateMany({where:{id:card.id,restaurantId:card.restaurantId,status:'ACTIVE',customerId:current.customerId},
         data:{failedGuestViewAttempts:failure.attempts,guestViewLockedUntil:failure.lockedUntil}});
       return {blocked:true as const};
     }
     const session=crypto.randomBytes(32).toString('base64url');
     await tx.nfcCard.updateMany({where:{id:card.id,restaurantId:card.restaurantId,status:'ACTIVE',customerId:current.customerId},
       data:{failedGuestViewAttempts:0,guestViewLockedUntil:null}});
     // Scoped to this particular visit; expiry and revocation are checked on every read.
     const visit=await tx.nfcComanda.findFirst({
       where:{id:comanda.id,restaurantId:card.restaurantId},
       select:{openedByUserId:true},
     });
     if(!visit)throw new Error('Visita indisponível');
     await tx.nfcComandaAccess.create({data:{
       restaurantId:card.restaurantId,comandaId:comanda.id,
       codeHash:hash(crypto.randomBytes(32).toString('base64url')),
       sessionHash:nfcCustomerSessionHash(session),sessionExpiresAt:new Date(Date.now()+sessionLife),
       expiresAt:new Date(Date.now()+sessionLife),createdByUserId:visit.openedByUserId,
     }});
     return {session};
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
   if(!result)return genericError(res);
   if('blocked' in result)return genericError(res,429);
   noStore(res);
   return res.json({sessionToken:result.session,expiresInSeconds:sessionLife/1000});
 }catch(error){
   if(error instanceof z.ZodError)return genericError(res,422);
   return genericError(res,503);
 }
});
// Assistance requires the short-lived NFC customer session created after
// 3 CPF prefix digits are verified. Raw card URLs cannot create calls.
router.post('/assistance',async(req,res)=>{
 try {
   const body=z.strictObject({token:z.string().regex(tokenPattern),sessionToken:z.string().regex(sessionPattern)}).parse(req.body);
   const card=await activeVisit(body.token);
   if(!card)return genericError(res,401);
   const restaurantId=card.card.restaurantId;
   const subscription=await prisma.subscription.findUnique({where:{restaurantId},select:{plan:true,status:true,restaurant:{select:{active:true,accessBlockReason:true,billingTemporaryAccessUntil:true}}}});
   if(!hasNfcCardAccess(subscription?.plan,subscription?.status,subscription?.restaurant))return genericError(res,403);
   const response=await prisma.$transaction(async tx=>{
     await setTenantDbContext(tx,restaurantId);
     await tx.$queryRaw`SELECT "id" FROM "NfcCard" WHERE "id"=${card.card.id}::uuid AND "restaurantId"=${restaurantId} FOR UPDATE`;
     const active=await tx.nfcCard.findFirst({where:{id:card.card.id,restaurantId,status:'ACTIVE',customerId:card.card.customerId},select:{id:true,customerId:true}});
     if(!active?.customerId)return null;
     const access=await tx.nfcComandaAccess.findFirst({where:{restaurantId,sessionHash:nfcCustomerSessionHash(body.sessionToken),revokedAt:null,sessionExpiresAt:{gt:new Date()},expiresAt:{gt:new Date()}},select:{comandaId:true}});
     if(!access)return null;
     const comanda=await tx.nfcComanda.findFirst({where:{id:access.comandaId,restaurantId,cardId:active.id,customerId:active.customerId,status:'OPEN'},select:{id:true,tableNumber:true}});
     if(!comanda)return null;
     const existing=await tx.nfcServiceCall.findFirst({where:{restaurantId,comandaId:comanda.id,status:{in:['WAITING','IN_PROGRESS']}},select:{id:true,status:true}});
     if(existing)return {call:existing,duplicate:true};
     const created=await tx.nfcServiceCall.create({data:{restaurantId,cardId:active.id,comandaId:comanda.id,tableNumber:comanda.tableNumber},select:{id:true,status:true}});
     return {call:created,duplicate:false};
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
   if(!response)return genericError(res,401);
   noStore(res);
   if(!response.duplicate){
     try { const events=await import('../../waiterCalls/realtime/tableServiceCallEvents.js');
       await events.tableServiceCallEvents.nfcChanged(restaurantId,response.call.id,'created');
     }catch(error){console.error('[NFC_ASSISTANCE_REALTIME]',error);}
   }
   return res.status(response.duplicate?200:201).json({status:response.call.status,duplicate:response.duplicate});
 }catch(error){
   if(error instanceof z.ZodError)return genericError(res,422);
   if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002')return res.status(409).json({error:'Chamado já em processamento. Atualize a comanda.'});
   return genericError(res,503);
 }
});
router.get('/account',async(req,res)=>{
 try{
   const session=String(req.get('x-nfc-customer-session')||'');
   if(!sessionPattern.test(session))return genericError(res,401);
   const cardToken=String(req.get('x-nfc-card-token')||'');
   if(!tokenPattern.test(cardToken))return genericError(res,401);
   const card=await activeVisit(cardToken);
   if(!card)return genericError(res,401);
   // Resolve tenant only through the card, then query RLS-protected access records
   // inside a transaction with a trusted tenant context.
   const subscription=await prisma.subscription.findUnique({where:{restaurantId:card.card.restaurantId},
     select:{plan:true,status:true,restaurant:{select:{active:true,accessBlockReason:true,billingTemporaryAccessUntil:true}}}});
   if(!hasNfcCardAccess(subscription?.plan,subscription?.status,subscription?.restaurant))return genericError(res,403);
   const payload=await withTenantDbContext(card.card.restaurantId,async tx=>{
     const record=await tx.nfcComandaAccess.findFirst({
       where:{sessionHash:nfcCustomerSessionHash(session),restaurantId:card.card.restaurantId,
         revokedAt:null,sessionExpiresAt:{gt:new Date()},expiresAt:{gt:new Date()}},
       select:{id:true,comandaId:true},
     });
     if(!record)return null;
     const comanda=await tx.nfcComanda.findFirst({
       where:{id:record.comandaId,restaurantId:card.card.restaurantId,
         cardId:card.card.id,customerId:card.card.customerId!,status:'OPEN'},
       select:{id:true,customerId:true,cardId:true,tableNumber:true,status:true,openedAt:true,
         totalCents:true,paidCents:true,customer:{select:{nameEncrypted:true}},restaurant:{select:{name:true}},
         items:{select:{id:true,kind:true,description:true,quantity:true,unitPriceCents:true,totalCents:true,createdAt:true,sourceOrderId:true,sourceOrderItemId:true},orderBy:{createdAt:'asc'}},
         orders:{select:{id:true,status:true,createdAt:true,observation:true,items:{select:{id:true,observation:true}}},orderBy:{createdAt:'asc'}},
         payments:{where:{status:'CONFIRMED',reversedAt:null},select:{id:true,amountCents:true,confirmedAt:true},orderBy:{confirmedAt:'desc'}},
       },
     });
     if(!comanda?.cardId)return null;
     const activeCard=await tx.nfcCard.findFirst({where:{restaurantId:card.card.restaurantId,id:comanda.cardId,
       customerId:comanda.customerId,status:'ACTIVE'},select:{id:true,displayCode:true}});
     if(!activeCard)return null;
     const notes=new Map(comanda.orders.flatMap(order=>order.items.map(item=>[item.id,item.observation] as const)));
     return {id:comanda.id,cardCode:activeCard.displayCode,tableNumber:comanda.tableNumber,status:comanda.status,openedAt:comanda.openedAt,
       customerName:decryptNfcPii(card.card.restaurantId,comanda.customerId,'name',comanda.customer.nameEncrypted),restaurantName:comanda.restaurant.name,
       totalCents:Number(comanda.totalCents),paidCents:Number(comanda.paidCents),
       outstandingCents:Math.max(0,Number(comanda.totalCents-comanda.paidCents)),
       items:comanda.items.map(item=>({id:item.id,kind:item.kind,description:item.description,quantity:item.quantity,
         unitPriceCents:Number(item.unitPriceCents),totalCents:Number(item.totalCents),createdAt:item.createdAt,
         sourceOrderId:item.sourceOrderId,observation:item.sourceOrderItemId?notes.get(item.sourceOrderItemId)??null:null})),
       orders:comanda.orders.map(order=>({id:order.id,status:order.status,createdAt:order.createdAt,observation:order.observation})),
       payments:comanda.payments.map(payment=>({id:payment.id,amountCents:Number(payment.amountCents),confirmedAt:payment.confirmedAt}))};
   });
   if(!payload)return genericError(res,401);
   noStore(res);
   return res.json({comanda:payload,updatedAt:new Date().toISOString()});
 }catch{return genericError(res,503);}
});
export default router;
