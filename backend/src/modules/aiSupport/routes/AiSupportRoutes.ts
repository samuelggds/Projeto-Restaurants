import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import ListSupportChatMessagesController from '../controllers/ListSupportChatMessagesController.js';
import GetAllSupportTicketsController from '../controllers/GetAllSupportTicketsController.js';

const router = Router();

router.get('/messages', authMiddleware, (req, res) => {
  ListSupportChatMessagesController.handle(req, res);
});

router.get('/tickets/all', authMiddleware, superAdminMiddleware, (req, res) => {
  GetAllSupportTicketsController.handle(req, res);
});

export default router;
