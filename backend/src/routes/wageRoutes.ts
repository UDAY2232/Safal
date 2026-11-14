import { Router } from 'express';
import {
  getWages,
  generateWagePeriod,
  recordWagePayment,
} from '../controllers/wageController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getWages);
router.post('/generate-period', requireRole('ADMIN'), generateWagePeriod);
router.post('/:id/payments', requireRole('ADMIN', 'ACCOUNTANT'), recordWagePayment);

export default router;

