import { Router } from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
} from '../controllers/employeeController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', requireRole('ADMIN'), createEmployee);
router.put('/:id', requireRole('ADMIN'), updateEmployee);
router.patch('/:id/status', requireRole('ADMIN'), toggleEmployeeStatus);

export default router;

