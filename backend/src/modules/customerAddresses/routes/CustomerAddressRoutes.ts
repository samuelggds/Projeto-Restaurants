import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import customerAddressController from '../controllers/CustomerAddressController.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res) => customerAddressController.list(req, res));
router.post('/', (req, res) => customerAddressController.create(req, res));
router.put('/:id/default', (req, res) => customerAddressController.setDefault(req, res));

export default router;
