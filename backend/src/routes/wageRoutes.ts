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
router.use(requireRole('ADMIN'));

router.get('/', getWages);
router.post('/generate-period', generateWagePeriod);
router.post('/:id/payments', recordWagePayment);

export default router;

