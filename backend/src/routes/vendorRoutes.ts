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
} from '../controllers/vendorController.js';

const router = Router();

// Vendor Self Operations
router.get('/profile', authenticateToken, getVendorProfile);
router.put('/profile', authenticateToken, updateVendorProfile);
router.get('/purchase-orders', authenticateToken, getVendorPOs);
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

// Admin / Accountant Management Routes
router.get('/admin/all', authenticateToken, getAllVendors);
router.post('/admin/create', authenticateToken, createVendor);
router.patch('/admin/:id/toggle-lock', authenticateToken, toggleVendorKycLock);
router.put('/admin/:id', authenticateToken, updateVendorByAdmin);

export default router;
