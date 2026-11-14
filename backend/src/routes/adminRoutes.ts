import { Router } from 'express';
import {
  getAdminDashboard,
  getAccountants,
  createAccountant,
  updateAccountant,
  toggleAccountantStatus,
  getAccountantPerformance,
  getActivityLogs,
} from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/dashboard', getAdminDashboard);
router.get('/accountants', getAccountants);
router.post('/accountants', createAccountant);
router.put('/accountants/:id', updateAccountant);
router.patch('/accountants/:id/status', toggleAccountantStatus);
router.get('/accountant-performance', getAccountantPerformance);
router.get('/activity-logs', getActivityLogs);

export default router;

