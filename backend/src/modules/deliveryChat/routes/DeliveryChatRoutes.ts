import { Router } from 'express';
import DeliveryChatController from '../controllers/DeliveryChatController.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { deliveryTrackingAccessMiddleware } from '../../../middlewares/deliveryTrackingAccessMiddleware.js';

const router = Router();

router.get('/courier/inbox', authMiddleware, (req, res) => {
  DeliveryChatController.courierInbox(req, res);
});

router.get('/:id', deliveryTrackingAccessMiddleware, (req, res) => {
  DeliveryChatController.get(req, res);
});

router.post('/:id/read', deliveryTrackingAccessMiddleware, (req, res) => {
  DeliveryChatController.markRead(req, res);
});

router.post('/:id/messages', deliveryTrackingAccessMiddleware, (req, res) => {
  DeliveryChatController.send(req, res);
});

export default router;
