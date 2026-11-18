import { Router } from 'express';
import { getClearanceBills, clearBillPayment } from '../controllers/clearanceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'));

router.get('/bills', getClearanceBills);
router.post('/record-payment', clearBillPayment);

export default router;

