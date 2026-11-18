import { Router } from 'express';
import {
  clockIn,
  clockOut,
  getTodayStatus,
  getMyHistory,
  getAllAttendanceRecords,
} from '../controllers/attendanceController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

// Individual attendance actions (available to all logged-in staff)
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', getTodayStatus);
router.get('/my-history', getMyHistory);

// Management / Administrative overview
router.get('/all', requireRole('ADMIN', 'ACCOUNTANT'), getAllAttendanceRecords);

export default router;
