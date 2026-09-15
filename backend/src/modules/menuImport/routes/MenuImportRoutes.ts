import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';
import ImportIfoodMenuController from '../controllers/ImportIfoodMenuController.js';
import ImportMenuFromImageController from '../controllers/ImportMenuFromImageController.js';
import GenerateImportedProductImageController from '../controllers/GenerateImportedProductImageController.js';
import MenuImportDraftController from '../controllers/MenuImportDraftController.js';

const router = Router();

router.post('/ifood', authMiddleware, adminMiddleware, (req, res) => {
  ImportIfoodMenuController.handle(req, res);
});

// Endpoint legado mantido por compatibilidade. A interface ADMIN nova usa /image/preview
// para garantir revisão explícita antes de publicar qualquer produto.
router.post('/image', authMiddleware, adminMiddleware, (req, res) => {
  ImportMenuFromImageController.handle(req, res);
});
router.post('/image/preview', authMiddleware, adminMiddleware, (req, res) => {
  MenuImportDraftController.previewImage(req, res);
});
router.get('/drafts/:publicId', authMiddleware, adminMiddleware, (req, res) => {
  MenuImportDraftController.get(req, res);
});
router.patch('/drafts/:publicId/items/:itemPublicId', authMiddleware, adminMiddleware, (req, res) => {
  MenuImportDraftController.updateItem(req, res);
});
router.post('/drafts/:publicId/publish', authMiddleware, adminMiddleware, (req, res) => {
  MenuImportDraftController.publish(req, res);
});

router.post(
  '/products/:productId/generate-image',
  authMiddleware,
  adminMiddleware,
  billingMiddleware,
  (req, res) => {
    GenerateImportedProductImageController.handle(req, res);
  },
);

export default router;
