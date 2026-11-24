import { Router } from 'express';
import {
  getWages,
  getMySalary,
  generateWagePeriod,
  recordWagePayment,
} from '../controllers/wageController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

// Personal salary information for the logged-in employee (strictly self-only)
router.get('/my-salary', getMySalary);

// Administrative Wage & Payroll Management (Admin Only)
router.use(requireRole('ADMIN'));

router.get('/', getWages);
router.post('/generate-period', generateWagePeriod);
router.post('/:id/payments', recordWagePayment);

export default router;

