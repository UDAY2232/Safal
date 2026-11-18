import { Router } from 'express';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  recordInvoicePayment,
  deleteInvoice,
} from '../controllers/invoiceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getInvoices);
router.get('/:id', getInvoiceById);

// Admin & Staff can manage invoices
router.post('/', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), createInvoice);
router.put('/:id/payment', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), recordInvoicePayment);
router.delete('/:id', requireRole('ADMIN'), deleteInvoice);

export default router;
