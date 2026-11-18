import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
} from '../controllers/supplierController.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.post('/', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), createSupplier);
router.put('/:id', requireRole('ADMIN', 'ACCOUNTANT', 'EMPLOYEE'), updateSupplier);

export default router;

