import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  getFieldAreas,
  createFieldArea,
  assignAreaToEmployee,
  removeAreaAssignment,
  getFieldSellers,
  createFieldSeller,
  verifyFieldSeller,
  getFieldVisits,
  createFieldVisit,
  getDailyFieldReports,
  submitDailyFieldReport,
  reviewDailyFieldReport,
  linkPurchaseConversion,
  getPointsAndLeaderboard,
  getMyPerformancePoints,
  adjustPointsManually,
  getEmployeeFieldDashboard,
  getAdminFieldDashboard,
} from '../controllers/fieldWorkController.js';
import {
  getMyRegisteredSellers,
  getSellerBusinessProfile,
  getMonthlySellerBusiness,
  getEmployeeSalesPerformance,
  getSellerOrders,
  createSellerOrder,
  getAdminBusinessOverview,
  getAdminEmployeePerformance,
  getAdminAreaPerformance,
  getAdminSellerReports,
  getAdminMonthlyReport,
  transferSellerAttribution,
} from '../controllers/sellerBusinessController.js';

const router = Router();

// Protect all field work routes with authenticated token
router.use(authenticateToken);

// Dashboards
router.get('/dashboard/employee', getEmployeeFieldDashboard);
router.get('/dashboard/admin', getAdminFieldDashboard);

// Area Allocation & Management
router.get('/areas', getFieldAreas);
router.post('/areas', createFieldArea);
router.post('/areas/assign', assignAreaToEmployee);
router.delete('/areas/assignment/:id', removeAreaAssignment);

// Sellers & Leads
router.get('/sellers', getFieldSellers);
router.post('/sellers', createFieldSeller);
router.post('/sellers/:id/verify', verifyFieldSeller);

// Field Visits
router.get('/visits', getFieldVisits);
router.post('/visits', upload.any(), createFieldVisit);

// Daily Field Reports
router.get('/reports', getDailyFieldReports);
router.post('/reports', submitDailyFieldReport);
router.post('/reports/:id/review', reviewDailyFieldReport);

// Conversions & Purchases
router.post('/conversions/link-purchase', linkPurchaseConversion);

// ==========================================
// SELLER BUSINESS & PURCHASE TRACKING ROUTES
// ==========================================
// Employee / Shared Seller Business
router.get('/seller-business/my-sellers', getMyRegisteredSellers);
router.get('/seller-business/seller/:id', getSellerBusinessProfile);
router.get('/seller-business/monthly-summary', getMonthlySellerBusiness);
router.get('/seller-business/my-performance', getEmployeeSalesPerformance);
router.get('/seller-business/orders', getSellerOrders);
router.post('/seller-business/orders', createSellerOrder);

// Admin Business Analytics
router.get('/seller-business/admin/overview', getAdminBusinessOverview);
router.get('/seller-business/admin/employees', getAdminEmployeePerformance);
router.get('/seller-business/admin/areas', getAdminAreaPerformance);
router.get('/seller-business/admin/sellers', getAdminSellerReports);
router.get('/seller-business/admin/monthly-report', getAdminMonthlyReport);
router.post('/seller-business/admin/transfer-seller', transferSellerAttribution);

// Performance & Points
router.get('/points/my', getMyPerformancePoints);
router.get('/points/leaderboard', getPointsAndLeaderboard);
router.post('/points/adjust', adjustPointsManually);

export default router;
