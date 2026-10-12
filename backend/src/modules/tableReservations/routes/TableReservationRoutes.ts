import { Router } from 'express';
import { ZodError } from 'zod';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { waiterMiddleware } from '../../../middlewares/waiterMiddleware.js';
import { premiumTablePlanMiddleware } from '../../../middlewares/premiumTablePlanMiddleware.js';
import service, { ReservationError } from '../services/TableReservationService.js';
const router = Router();
router.use(authMiddleware, waiterMiddleware, premiumTablePlanMiddleware);
function respond(res: import('express').Response, error: unknown) {
  const status = error instanceof ZodError ? 422 : error instanceof ReservationError ? error.statusCode : 500;
  return res.status(status).json({ error: error instanceof ZodError ? error.issues[0]?.message : error instanceof ReservationError ? error.message : 'Não foi possível concluir a operação.' });
}
router.get('/settings', async (req,res) => { try { res.json(await service.settings(req.user.restaurantId)); } catch(e){ respond(res,e); } });
router.put('/settings', async (req,res) => {
  try {
    if (String(req.user.role).toUpperCase() !== 'ADMIN') return res.status(403).json({error:'Apenas administradores podem alterar reservas.'});
    res.json(await service.updateSettings(req.user.restaurantId,req.body?.enabled,req.body?.toleranceMinutes));
  } catch(e){ respond(res,e); }
});
router.get('/',async(req,res)=>{
  try { res.json(await service.list(req.user.restaurantId,String(req.query.from||''),String(req.query.to||''))); }
  catch(e){respond(res,e);}
});
router.post('/',async(req,res)=>{
  try{res.status(201).json(await service.create(req.user.restaurantId,req.user.id,req.body));}
  catch(e){respond(res,e);}
});
router.patch('/:publicId/status',async(req,res)=>{
  try{res.json(await service.changeStatus(req.user.restaurantId,req.params.publicId,req.body?.status));}
  catch(e){respond(res,e);}
});
router.post('/:publicId/check-in',async(req,res)=>{
  try{res.json(await service.checkIn(req.user.restaurantId,req.params.publicId,req.user.id));}
  catch(e){respond(res,e);}
});
export default router;
