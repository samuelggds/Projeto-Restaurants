import crypto from 'node:crypto';
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../config/prisma.js';
import { setTenantDbContext, withTenantDbContext } from '../../../database/tenantDbContext.js';
import { nfcCpfFingerprints } from '../security/nfcCustomerPii.js';
import { nextNfcReturnCpfFailure } from '../domain/nfcReturnCpfLockout.js';
import { hasNfcCardAccess } from '../../billing/domain/planFeaturePolicy.js';

const router=Router();
const tokenPattern=/^[A-Za-z0-9_-]{32,128}$/u;
const sessionPattern=/^[A-Za-z0-9_-]{43}$/u;
const verify=z.strictObject({token:z.string().regex(tokenPattern),cpf:z.string().regex(/^\d{11}$/u)});
const sessionLife=15*60_000;
const hash=(text:string)=>crypto.createHash('sha256').update(text).digest('hex');
const fingerprintsMatch=(expected:string,actual:string[])=>actual.some(value=>{
 const a=Buffer.from(expected,'hex'),b=Buffer.from(value,'hex');
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
});
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
router.post('/verify',async(req,res)=>{
 try{
   const input=verify.parse(req.body);
   const resolved=await activeVisit(input.token);
   if(!resolved)return genericError(res);
   const {card}=resolved;
   const subscription=await prisma.subscription.findUnique({where:{restaurantId:card.restaurantId},select:{plan:true,status:true}});
   if(!hasNfcCardAccess(subscription?.plan,subscription?.status))return genericError(res);
   const result=await prisma.$transaction(async tx=>{
     await setTenantDbContext(tx,card.restaurantId);
     // Lock card first so simultaneous wrong CPFs cannot bypass lockout.
     await tx.$queryRaw`SELECT "id" FROM "NfcCard" WHERE "restaurantId"=${card.restaurantId} AND "id"=${card.id}::uuid FOR UPDATE`;
     const current=await tx.nfcCard.findFirst({where:{id:card.id,restaurantId:card.restaurantId,status:'ACTIVE',customerId:card.customerId},select:{
       id:true,customerId:true,failedGuestViewAttempts:true,guestViewLockedUntil:true,
     }});
     if(!current?.customerId)return null;
     if(current.guestViewLockedUntil&&current.guestViewLockedUntil>new Date())return {blocked:true as const};
     const customer=await tx.nfcCustomer.findFirst({where:{id:current.customerId,restaurantId:card.restaurantId},select:{cpfFingerprint:true}});
     const comanda=await tx.nfcComanda.findFirst({
       where:{restaurantId:card.restaurantId,customerId:current.customerId,cardId:card.id,status:'OPEN'},
       select:{id:true},orderBy:{openedAt:'desc'},
     });
     if(!customer||!comanda)return null;
     if(!fingerprintsMatch(customer.cpfFingerprint,nfcCpfFingerprints(card.restaurantId,input.cpf))){
       const failure=nextNfcReturnCpfFailure(current.failedGuestViewAttempts,new Date());
       await tx.nfcCard.updateMany({where:{id:card.id,restaurantId:card.restaurantId,status:'ACTIVE',customerId:current.customerId},
         data:{failedGuestViewAttempts:failure.attempts,guestViewLockedUntil:failure.lockedUntil}});
       return {blocked:true as const};
     }
     const session=crypto.randomBytes(32).toString('base64url');
     await tx.nfcCard.updateMany({where:{id:card.id,restaurantId:card.restaurantId,status:'ACTIVE',customerId:current.customerId},
       data:{failedGuestViewAttempts:0,guestViewLockedUntil:null}});
     // Scoped to this particular visit; expiry and revocation are checked on every read.
     await tx.nfcComandaAccess.create({data:{
       restaurantId:card.restaurantId,comandaId:comanda.id,
       codeHash:hash(crypto.randomBytes(32).toString('base64url')),
       sessionHash:hash(session),sessionExpiresAt:new Date(Date.now()+sessionLife),
       expiresAt:new Date(Date.now()+sessionLife),createdByUserId:0,
     }}).catch(async()=>{
       // Existing access records require an actor FK. Reuse a verifiable staff actor from the comanda.
       const visit=await tx.nfcComanda.findFirst({where:{id:comanda.id,restaurantId:card.restaurantId},select:{openedByUserId:true}});
       if(!visit)throw new Error('Visita indisponível');
       await tx.nfcComandaAccess.create({data:{
         restaurantId:card.restaurantId,comandaId:comanda.id,
         codeHash:hash(crypto.randomBytes(32).toString('base64url')),
         sessionHash:hash(session),sessionExpiresAt:new Date(Date.now()+sessionLife),
         expiresAt:new Date(Date.now()+sessionLife),createdByUserId:visit.openedByUserId,
       }});
     });
     return {session};
   },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
   if(!result||'blocked' in result)return genericError(res,429);
   noStore(res);
   return res.json({sessionToken:result.session,expiresInSeconds:sessionLife/1000});
 }catch(error){
   if(error instanceof z.ZodError)return genericError(res,422);
   return genericError(res,503);
 }
});
router.get('/account',async(req,res)=>{
 try{
   const session=String(req.get('x-nfc-customer-session')||'');
   if(!sessionPattern.test(session))return genericError(res,401);
   const result=await prisma.nfcComandaAccess.findFirst({where:{sessionHash:hash(session),revokedAt:null,
     sessionExpiresAt:{gt:new Date()},expiresAt:{gt:new Date()}},select:{restaurantId:true,comandaId:true}});
   if(!result)return genericError(res,401);
   const payload=await withTenantDbContext(result.restaurantId,async tx=>{
     const record=await tx.nfcComandaAccess.findFirst({where:{sessionHash:hash(session),restaurantId:result.restaurantId,
       comandaId:result.comandaId,revokedAt:null,sessionExpiresAt:{gt:new Date()},expiresAt:{gt:new Date()}},select:{id:true}});
     if(!record)return null;
     const comanda=await tx.nfcComanda.findFirst({where:{id:result.comandaId,restaurantId:result.restaurantId,status:'OPEN'},
       select:{id:true,customerId:true,cardId:true,tableNumber:true,status:true,openedAt:true,
         totalCents:true,paidCents:true,
         items:{select:{id:true,kind:true,description:true,quantity:true,totalCents:true,createdAt:true,sourceOrderId:true},orderBy:{createdAt:'asc'}},
         orders:{select:{id:true,status:true,createdAt:true},orderBy:{createdAt:'asc'}},
       }});
     if(!comanda?.cardId)return null;
     const card=await tx.nfcCard.findFirst({where:{restaurantId:result.restaurantId,id:comanda.cardId,
       customerId:comanda.customerId,status:'ACTIVE'},select:{id:true,displayCode:true}});
     if(!card)return null;
     return {id:comanda.id,cardCode:card.displayCode,tableNumber:comanda.tableNumber,status:comanda.status,openedAt:comanda.openedAt,
       totalCents:Number(comanda.totalCents),paidCents:Number(comanda.paidCents),
       outstandingCents:Math.max(0,Number(comanda.totalCents-comanda.paidCents)),
       items:comanda.items.map(item=>({...item,totalCents:Number(item.totalCents)})),orders:comanda.orders};
   });
   if(!payload)return genericError(res,401);
   noStore(res);
   return res.json({comanda:payload,updatedAt:new Date().toISOString()});
 }catch{return genericError(res,503);}
});
export default router;
