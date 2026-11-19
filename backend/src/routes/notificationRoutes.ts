import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
} from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllAsRead);
router.post('/send', requireRole('ADMIN', 'ACCOUNTANT'), sendNotification);

export default router;

