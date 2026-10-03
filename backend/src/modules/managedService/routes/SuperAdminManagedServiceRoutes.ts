import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import ManagedServiceController from '../controllers/ManagedServiceController.js';
import SuperAdminManagedRestaurantController from '../controllers/SuperAdminManagedRestaurantController.js';

const router = Router();
router.use(authMiddleware, superAdminMiddleware);

router.get('/', (req, res, next) => ManagedServiceController.superQueue(req, res, next));
router.get('/restaurants/:restaurantId/workspace', (req, res, next) =>
  SuperAdminManagedRestaurantController.workspace(req, res, next),
);
router.post('/restaurants/:restaurantId/products', (req, res, next) =>
  SuperAdminManagedRestaurantController.createProduct(req, res, next),
);
router.patch('/restaurants/:restaurantId/products/:productId', (req, res, next) =>
  SuperAdminManagedRestaurantController.updateProduct(req, res, next),
);
router.post('/restaurants/:restaurantId/categories', (req, res, next) =>
  SuperAdminManagedRestaurantController.createCategory(req, res, next),
);
router.patch('/restaurants/:restaurantId/categories/:categoryId', (req, res, next) =>
  SuperAdminManagedRestaurantController.updateCategory(req, res, next),
);
router.post('/restaurants/:restaurantId/combos', (req, res, next) =>
  SuperAdminManagedRestaurantController.createCombo(req, res, next),
);
router.patch('/restaurants/:restaurantId/combos/:comboId', (req, res, next) =>
  SuperAdminManagedRestaurantController.updateCombo(req, res, next),
);
router.post('/restaurants/:restaurantId/banners', (req, res, next) =>
  SuperAdminManagedRestaurantController.createBanner(req, res, next),
);
router.patch('/restaurants/:restaurantId/banners/:bannerId', (req, res, next) =>
  SuperAdminManagedRestaurantController.updateBanner(req, res, next),
);
router.patch('/restaurants/:restaurantId/settings', (req, res, next) =>
  SuperAdminManagedRestaurantController.updateSettings(req, res, next),
);
router.patch('/implementations/:restaurantId', (req, res, next) =>
  ManagedServiceController.updateImplementation(req, res, next),
);
router.patch('/requests/:requestId', (req, res, next) =>
  ManagedServiceController.updateRequest(req, res, next),
);

export default router;
