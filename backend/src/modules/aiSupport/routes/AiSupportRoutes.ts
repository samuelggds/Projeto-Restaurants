import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import ListSupportChatMessagesController from '../controllers/ListSupportChatMessagesController.js';
import GetAllSupportTicketsController from '../controllers/GetAllSupportTicketsController.js';
import UpdateSupportIssueController from '../controllers/UpdateSupportIssueController.js';
import DeleteSupportIssueController from '../controllers/DeleteSupportIssueController.js';
import ListMySupportIssueUpdatesController from '../controllers/ListMySupportIssueUpdatesController.js';
import AdminAiGuideController from '../controllers/AdminAiGuideController.js';

const router = Router();

router.get('/messages', authMiddleware, (req, res) => {
  ListSupportChatMessagesController.handle(req, res);
});
router.get('/my-issue-updates', authMiddleware, (req, res) => {
  ListMySupportIssueUpdatesController.handle(req, res);
});
router.get('/credits', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.balance(req, res);
});
router.post('/guide', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.guide(req, res);
});

router.get('/tickets/all', authMiddleware, superAdminMiddleware, (req, res) => {
  GetAllSupportTicketsController.handle(req, res);
});
router.patch('/messages/:id/issue', authMiddleware, (req, res) =>
  UpdateSupportIssueController.handle(req, res),
);
router.delete('/messages/:id/issue', authMiddleware, (req, res) =>
  DeleteSupportIssueController.handle(req, res),
);

export default router;
