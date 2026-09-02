import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { adminMiddleware } from '../../../middlewares/adminMiddleware.js';
import { ingredientImageSearchRateLimitMiddleware } from '../../../middlewares/security/ingredientImageSearchRateLimitMiddleware.js';
import {
  createIngredient,
  deleteIngredient,
  listIngredients,
  searchIngredientImages,
  updateIngredient,
} from '../controllers/IngredientControllers.js';

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get('/', listIngredients);
router.post('/image-search', ingredientImageSearchRateLimitMiddleware, searchIngredientImages);
router.post('/', createIngredient);
router.put('/:id', updateIngredient);
router.delete('/:id', deleteIngredient);

export default router;
