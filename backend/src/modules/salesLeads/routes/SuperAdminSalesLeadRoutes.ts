import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/authMiddleware.js';
import { superAdminMiddleware } from '../../../middlewares/superAdminMiddleware.js';
import salesLeadService from '../services/SalesLeadService.js';
import {
  createPlatformWhatsappConnection,
  disconnectPlatformWhatsappConnection,
  enqueueManualCommercialWhatsappMessage,
  getCommercialWhatsappSettings,
  getPlatformWhatsappConnection,
  getPlatformWhatsappQrCode,
  listCommercialWhatsappConversations,
  refreshPlatformWhatsappConnection,
  setCommercialWhatsappConversationMode,
  updateCommercialWhatsappSettings,
} from '../services/CommercialWhatsappService.js';

const router = Router();
router.use(authMiddleware, superAdminMiddleware);
router.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

router.get('/', async (req, res, next) => {
  try {
    return res.json(await salesLeadService.list(req.query));
  } catch (error) {
    return next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    return res.json(
      await salesLeadService.updateStatus(req.params.id, req.body, Number(req.user?.id)),
    );
  } catch (error) {
    return next(error);
  }
});

export default router;


router.get('/commercial-whatsapp/settings', async (_req, res, next) => {
  try {
    return res.json(await getCommercialWhatsappSettings());
  } catch (error) {
    return next(error);
  }
});

router.put('/commercial-whatsapp/settings', async (req, res, next) => {
  try {
    return res.json(await updateCommercialWhatsappSettings(req.body));
  } catch (error) {
    return next(error);
  }
});

router.get('/commercial-whatsapp/connection', async (_req, res, next) => {
  try {
    return res.json(await getPlatformWhatsappConnection());
  } catch (error) {
    return next(error);
  }
});

router.post('/commercial-whatsapp/connection', async (_req, res, next) => {
  try {
    return res.status(201).json(await createPlatformWhatsappConnection());
  } catch (error) {
    return next(error);
  }
});

router.post('/commercial-whatsapp/connection/qr', async (_req, res, next) => {
  try {
    return res.json(await getPlatformWhatsappQrCode());
  } catch (error) {
    return next(error);
  }
});

router.post('/commercial-whatsapp/connection/refresh', async (_req, res, next) => {
  try {
    return res.json(await refreshPlatformWhatsappConnection());
  } catch (error) {
    return next(error);
  }
});

router.delete('/commercial-whatsapp/connection', async (_req, res, next) => {
  try {
    return res.json(await disconnectPlatformWhatsappConnection());
  } catch (error) {
    return next(error);
  }
});

router.get('/commercial-whatsapp/conversations', async (_req, res, next) => {
  try {
    return res.json(await listCommercialWhatsappConversations());
  } catch (error) {
    return next(error);
  }
});

router.patch('/commercial-whatsapp/conversations/:id/mode', async (req, res, next) => {
  try {
    const mode = req.body?.mode === 'HUMAN' ? 'HUMAN' : req.body?.mode === 'BOT' ? 'BOT' : null;
    if (!mode) return res.status(400).json({ error: 'Modo de atendimento inválido.' });
    return res.json(await setCommercialWhatsappConversationMode(req.params.id, mode));
  } catch (error) {
    return next(error);
  }
});

router.post('/commercial-whatsapp/conversations/:id/messages', async (req, res, next) => {
  try {
    return res.status(202).json(
      await enqueueManualCommercialWhatsappMessage(req.params.id, req.body?.message),
    );
  } catch (error) {
    return next(error);
  }
});
