import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { billingMiddleware } from '../../../middlewares/billingMiddleware.js';
import ImportIfoodMenuController from '../controllers/ImportIfoodMenuController.js';
import ImportMenuFromImageController from '../controllers/ImportMenuFromImageController.js';
import GenerateImportedProductImageController from '../controllers/GenerateImportedProductImageController.js';

const router = Router();

router.post('/ifood', authMiddleware, adminMiddleware, (req, res) => {
  ImportIfoodMenuController.handle(req, res);
});

router.post('/image', authMiddleware, adminMiddleware, (req, res) => {
  ImportMenuFromImageController.handle(req, res);
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
