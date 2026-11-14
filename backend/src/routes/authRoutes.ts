import { Router } from 'express';
import { login, getCurrentUser, logout, resetPassword } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateToken, getCurrentUser);
router.post('/logout', authenticateToken, logout);
router.post('/reset-password', authenticateToken, resetPassword);

export default router;

