import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  updateIngredient,
} from '../controllers/IngredientControllers.js';

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get('/', listIngredients);
router.post('/', createIngredient);
router.put('/:id', updateIngredient);
router.delete('/:id', deleteIngredient);

export default router;
