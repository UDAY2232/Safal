import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyHistory,
  getAllAttendanceRecords,
  getEmployeeAttendanceSummary,
  submitCorrectionRequest,
  reviewCorrectionRequest,
  reviewSalaryDeduction,
  getAdminAttendanceManagement,
  getAdminPenaltyReports,
  getWorkplaces,
  createWorkplace,
  updateWorkplace,
  deleteWorkplace,
  getAttendancePolicy,
  updateAttendancePolicy,
} from '../controllers/attendanceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken);

// Individual attendance actions with photo upload and GPS
router.post('/clock-in', upload.single('photo'), clockIn);
router.post('/clock-out', upload.single('photo'), clockOut);
router.get('/today', getTodayStatus);
router.get('/my-history', getMyHistory);
router.get('/summary/employee', getEmployeeAttendanceSummary);
router.post('/correction-request', submitCorrectionRequest);

// Workplaces list for all authenticated employees (to know geofence boundaries)
router.get('/workplaces', getWorkplaces);

// Management / Administrative overview & Roster
router.get('/all', requireRole('ADMIN', 'ACCOUNTANT'), getAllAttendanceRecords);
router.get('/admin/management', requireRole('ADMIN', 'ACCOUNTANT'), getAdminAttendanceManagement);
router.get('/admin/penalties', requireRole('ADMIN', 'ACCOUNTANT'), getAdminPenaltyReports);

// Dispute / Correction & Deduction Review Actions
router.post('/admin/correction/:id/review', requireRole('ADMIN'), reviewCorrectionRequest);
router.post('/admin/deduction/:id/review', requireRole('ADMIN'), reviewSalaryDeduction);

// Geofence & Policy Administration
router.post('/admin/workplaces', requireRole('ADMIN'), createWorkplace);
router.put('/admin/workplaces/:id', requireRole('ADMIN'), updateWorkplace);
router.delete('/admin/workplaces/:id', requireRole('ADMIN'), deleteWorkplace);

router.get('/admin/policy', requireRole('ADMIN'), getAttendancePolicy);
router.put('/admin/policy', requireRole('ADMIN'), updateAttendancePolicy);

export default router;
