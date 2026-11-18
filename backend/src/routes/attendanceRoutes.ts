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
import { upload } from '../middleware/upload.js';

const router = Router();

router.use(authenticateToken);

// Individual attendance actions with photo upload
router.post('/clock-in', upload.single('photo'), clockIn);
router.post('/clock-out', upload.single('photo'), clockOut);
router.get('/today', getTodayStatus);
router.get('/my-history', getMyHistory);

// Management / Administrative overview
router.get('/all', requireRole('ADMIN', 'ACCOUNTANT'), getAllAttendanceRecords);

export default router;
