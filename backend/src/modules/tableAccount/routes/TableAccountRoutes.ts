import { Router } from 'express';
import { optionalAuthMiddleware } from '../../../middlewares/optionalAuthMiddleware.js';
import { tableAccountSessionMiddleware } from '../../../middlewares/tableAccountSessionMiddleware.js';
import { tableParticipantMiddleware } from '../../../middlewares/tableParticipantMiddleware.js';
import GetCurrentTableAccountController from '../controllers/GetCurrentTableAccountController.js';

const router = Router();

router.get(
  '/sessions/:sessionPublicId',
  optionalAuthMiddleware,
  tableAccountSessionMiddleware,
  tableParticipantMiddleware,
  (req, res) => GetCurrentTableAccountController.handle(req, res),
);

export default router;
