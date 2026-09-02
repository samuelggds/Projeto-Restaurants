import { Router } from 'express';

import { publicRestaurantBillingMiddleware } from '../../../middlewares/publicRestaurantBillingMiddleware.js';
import GetPublicMediaController from '../controllers/GetPublicMediaController.js';

const router = Router();

router.get('/restaurants/:restaurantId/logo', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicMediaController.logo(req, res),
);
router.get('/restaurants/:restaurantId/cover', publicRestaurantBillingMiddleware, (req, res) =>
  GetPublicMediaController.cover(req, res),
);
router.get(
  '/restaurants/:restaurantId/banners/:bannerId',
  publicRestaurantBillingMiddleware,
  (req, res) => GetPublicMediaController.banner(req, res),
);
router.get(
  '/restaurants/:restaurantId/products/:productId',
  publicRestaurantBillingMiddleware,
  (req, res) => GetPublicMediaController.product(req, res),
);
router.get(
  '/restaurants/:restaurantId/ingredients/:ingredientId',
  publicRestaurantBillingMiddleware,
  (req, res) => GetPublicMediaController.ingredient(req, res),
);

export default router;
