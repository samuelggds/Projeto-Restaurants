import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import ManagedServiceController from '../controllers/ManagedServiceController.js';
import SuperAdminManagedRestaurantController from '../controllers/SuperAdminManagedRestaurantController.js';
import { enhanceManagedImage, managedImageRateLimits } from '../controllers/ManagedImageEnhancementController.js';

import { requestSetupAccess, listSetupAccess, requireSetupConsent } from '../controllers/RestaurantSetupAccessController.js';

const router = Router();
router.use(authMiddleware, superAdminMiddleware);

router.post('/restaurants/:restaurantId/setup-access', requestSetupAccess);
router.get('/restaurants/:restaurantId/setup-access', listSetupAccess);

// Access is checked at each workspace request; SUPER_ADMIN never inherits the tenant ADMIN role.
router.use('/restaurants/:restaurantId', requireSetupConsent);

router.get('/', (req, res, next) => ManagedServiceController.superQueue(req, res, next));
router.get('/restaurants/:restaurantId/workspace', (req, res, next) =>
  SuperAdminManagedRestaurantController.workspace(req, res, next),
);
router.post('/restaurants/:restaurantId/images/enhance', ...managedImageRateLimits, enhanceManagedImage);
router.post('/restaurants/:restaurantId/products', (req, res, next) =>
  SuperAdminManagedRestaurantController.createProduct(req, res, next),
);
router.patch('/restaurants/:restaurantId/products/:productId', (req, res, next) =>
  SuperAdminManagedRestaurantController.updateProduct(req, res, next),
);
router.post('/restaurants/:restaurantId/ingredients', (req, res, next) =>
  SuperAdminManagedRestaurantController.createIngredient(req, res, next),
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
