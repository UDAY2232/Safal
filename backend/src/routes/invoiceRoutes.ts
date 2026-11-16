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

// Admin & Accountants can manage invoices
router.post('/', requireRole('ADMIN', 'ACCOUNTANT'), createInvoice);
router.put('/:id/payment', requireRole('ADMIN', 'ACCOUNTANT'), recordInvoicePayment);
router.delete('/:id', requireRole('ADMIN'), deleteInvoice);

export default router;
