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
  deletePurchaseOrder,
  updatePurchaseOrder,
} from '../controllers/purchaseOrderController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getPurchaseOrders);
router.get('/:id/pdf', downloadPurchaseOrderPDF);
router.get('/:id(*)/pdf', downloadPurchaseOrderPDF);
router.get('/:id(*)', getPurchaseOrderById);
router.put('/:id(*)', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), updatePurchaseOrder);
router.delete('/:id(*)', requireRole('ADMIN'), deletePurchaseOrder);

// Creating & submitting POs (supports paymentProof upload for upfront CD payments)
router.post('/', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE', 'VENDOR'), upload.single('paymentProof'), createPurchaseOrder);
router.post('/due-orders', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), upload.single('paymentProof'), createDuePurchaseOrder);
router.post('/legacy-due', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), upload.single('paymentProof'), createDuePurchaseOrder);
router.post('/:id/submit', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), submitPurchaseOrder);

// Admin workflow
router.post('/:id/approve', requireRole('ADMIN'), approvePurchaseOrder);
router.post('/:id/reject', requireRole('ADMIN'), rejectPurchaseOrder);
router.post('/:id/close', requireRole('ADMIN'), closePurchaseOrder);

// Due Settlement & Payment Recording (with optional payment proof upload)
router.post('/:id/payments', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), upload.single('proof'), recordDuePayment);
router.post('/:id/due-payment', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), upload.single('proof'), recordDuePayment);

// Financial Profit & Loss Tracking
router.post('/:id/financials', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), updateFinancialRecords);

export default router;

