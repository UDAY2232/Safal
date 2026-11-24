import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getVendorProfile,
  updateVendorProfile,
  getVendorPOs,
  submitPODispatch,
  getVendorDashboardStats,
  getAllVendors,
  createVendor,
  toggleVendorKycLock,
  updateVendorByAdmin,
  submitHubQCInspection,
  createVendorSupplyPO,
  getVendorOperationsForAdmin,
  disburseVendorAdvance,
  settleVendorBalance,
  allotVendorPOVehicle,
} from '../controllers/vendorController.js';

const router = Router();

// Vendor Self Operations
router.get('/profile', authenticateToken, getVendorProfile);
router.put('/profile', authenticateToken, updateVendorProfile);
router.get('/purchase-orders', authenticateToken, getVendorPOs);
router.post(
  '/supply-po',
  authenticateToken,
  upload.fields([
    { name: 'vehiclePhoto', maxCount: 1 },
    { name: 'transportBill', maxCount: 1 },
  ]),
  createVendorSupplyPO
);
router.post(
  '/dispatch',
  authenticateToken,
  upload.fields([
    { name: 'vehiclePhoto', maxCount: 1 },
    { name: 'transportBill', maxCount: 1 },
  ]),
  submitPODispatch
);
router.get('/dashboard-stats', authenticateToken, getVendorDashboardStats);

// Hub QC & Weighbridge Inspection Submission
router.post(
  '/po/:id/qc-inspection',
  authenticateToken,
  upload.single('weighbridgeSlip'),
  submitHubQCInspection
);

// Admin / Accountant Management Routes
router.get('/admin/all', authenticateToken, getAllVendors);
router.get('/admin/operations', authenticateToken, getVendorOperationsForAdmin);
router.post('/admin/create', authenticateToken, createVendor);
router.patch('/admin/:id/toggle-lock', authenticateToken, toggleVendorKycLock);
router.put('/admin/:id', authenticateToken, updateVendorByAdmin);
router.post(
  '/admin/po/:id/disburse-advance',
  authenticateToken,
  upload.single('advanceProof'),
  disburseVendorAdvance
);
router.post(
  '/admin/po/:id/settle-balance',
  authenticateToken,
  upload.single('settlementProof'),
  settleVendorBalance
);
router.post(
  '/admin/po/:id/allot-vehicle',
  authenticateToken,
  upload.fields([
    { name: 'biltyFile', maxCount: 1 },
    { name: 'transportBill', maxCount: 1 },
  ]),
  allotVendorPOVehicle
);

export default router;
