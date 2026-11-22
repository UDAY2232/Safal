import { Router } from 'express';
import {
  getPOReports,
  getWageReports,
  getExpenseReports,
  getProfitLossReport,
} from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'));

router.get('/purchase-orders', getPOReports);
router.get('/customer-dues', (req, res) => {
  req.query.type = 'CD';
  req.query.format = req.query.format || 'csv';
  return getPOReports(req, res);
});
router.get('/wages', requireRole('ADMIN'), getWageReports);
router.get('/expenses', getExpenseReports);
router.get('/profit-loss', getProfitLossReport);

export default router;

