import { Router } from 'express';
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  rejectPurchaseOrder,
  closePurchaseOrder,
  updateFinancialRecords,
  downloadPurchaseOrderPDF,
  recordDuePayment,
  createDuePurchaseOrder,
} from '../controllers/purchaseOrderController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getPurchaseOrders);
router.get('/:id', getPurchaseOrderById);
router.get('/:id/pdf', downloadPurchaseOrderPDF);

// Creating & submitting POs
router.post('/', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), createPurchaseOrder);
router.post('/due-orders', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), createDuePurchaseOrder);
router.post('/legacy-due', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), createDuePurchaseOrder);
router.post('/:id/submit', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), submitPurchaseOrder);

// Admin workflow
router.post('/:id/approve', requireRole('ADMIN'), approvePurchaseOrder);
router.post('/:id/reject', requireRole('ADMIN'), rejectPurchaseOrder);
router.post('/:id/close', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), closePurchaseOrder);

// Due Settlement & Payment Recording
router.post('/:id/payments', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), recordDuePayment);
router.post('/:id/due-payment', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), recordDuePayment);

// Financial Profit & Loss Tracking
router.post('/:id/financials', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), updateFinancialRecords);

export default router;

