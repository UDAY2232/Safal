import { Router } from 'express';
import {
  getExpenses,
  getExpenseById,
  submitExpense,
  reviewExpense,
  approveExpense,
  rejectExpense,
  recordExpensePayment,
} from '../controllers/expenseController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getExpenses);
router.get('/:id', getExpenseById);

// Submit (allows upload of receipt)
router.post('/', upload.single('receipt'), submitExpense);

// Review by staff or admin
router.post('/:id/review', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), reviewExpense);

// Admin approval / rejection
router.post('/:id/approve', requireRole('ADMIN'), approveExpense);
router.post('/:id/reject', requireRole('ADMIN'), rejectExpense);

// Payment recording
router.post('/:id/payments', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), recordExpensePayment);

export default router;

