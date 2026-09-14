import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import salesLeadService from '../services/SalesLeadService.js';

const router = Router();
router.use(authMiddleware, superAdminMiddleware);
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.get('/', async (req, res, next) => {
  try {
    return res.json(await salesLeadService.list(req.query));
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    return res.json(
      await salesLeadService.updateStatus(req.params.id, req.body, Number(req.user?.id)),
    );
  } catch (error) {
    return next(error);
  }
});

export default router;
