import { Router } from 'express';
import DeliveryChatController from '../controllers/DeliveryChatController.js';
import { deliveryTrackingAccessMiddleware } from '../../../middlewares/deliveryTrackingAccessMiddleware.js';

const router = Router();

router.get('/:id', deliveryTrackingAccessMiddleware, (req, res) => {
  DeliveryChatController.get(req, res);
});

router.post('/:id/messages', deliveryTrackingAccessMiddleware, (req, res) => {
  DeliveryChatController.send(req, res);
});

export default router;
