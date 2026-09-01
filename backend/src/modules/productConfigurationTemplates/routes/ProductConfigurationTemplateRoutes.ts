import { Router } from 'express';

import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import {
  createProductConfigurationTemplate,
  deleteProductConfigurationTemplate,
  listProductConfigurationTemplates,
  updateProductConfigurationTemplate,
} from '../controllers/ProductConfigurationTemplateController.js';

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get('/', listProductConfigurationTemplates);
router.post('/', createProductConfigurationTemplate);
router.put('/:id', updateProductConfigurationTemplate);
router.delete('/:id', deleteProductConfigurationTemplate);

export default router;
