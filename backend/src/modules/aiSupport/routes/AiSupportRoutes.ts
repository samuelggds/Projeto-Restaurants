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
router.get('/credits/topups', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.topUps(req, res);
});
router.get('/credits/topup/quote', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.quote(req, res);
});
router.post('/credits/topup/pix', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.pixTopUp(req, res);
});
router.post('/credits/topup/card', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.cardTopUp(req, res);
});
router.post('/guide', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.guide(req, res);
});

// Assistente gerencial: sempre deriva o restaurante da sessão ADMIN autenticada.
router.get('/restaurant/capabilities', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.capabilities(req, res);
});
router.get('/restaurant/summary', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.managementSummary(req, res);
});
router.post('/restaurant/ask', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.assistant(req, res);
});
router.get('/restaurant/actions', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.actions(req, res);
});
router.post('/restaurant/actions/:publicId/approve', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.approveAction(req, res);
});
router.post('/restaurant/actions/:publicId/cancel', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.cancelAction(req, res);
});
router.get('/restaurant/settings', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.assistantSettings(req, res);
});
router.put('/restaurant/settings', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.updateAssistantSettings(req, res);
});
router.post('/restaurant/orders/:orderId/support-draft', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.supportDraft(req, res);
});

router.post('/restaurant/image-batches/estimate', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.estimateImageBatch(req, res);
});
router.post('/restaurant/image-batches', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.createImageBatch(req, res);
});
router.get('/restaurant/image-batches', authMiddleware, adminMiddleware, (req, res) => {
  AdminAiGuideController.imageBatches(req, res);
});
router.post(
  '/restaurant/image-batches/:jobPublicId/items/:itemPublicId/cancel',
  authMiddleware,
  adminMiddleware,
  (req, res) => AdminAiGuideController.cancelImageBatchItem(req, res),
);
router.post(
  '/restaurant/image-batches/:jobPublicId/retry-failures',
  authMiddleware,
  adminMiddleware,
  (req, res) => AdminAiGuideController.retryImageBatchFailures(req, res),
);

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
