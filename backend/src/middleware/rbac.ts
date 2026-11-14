import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export function requireRole(...allowedRoles: Array<'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE'>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Role '${req.user.role}' is not authorized for this resource.`,
      });
    }

    next();
  };
}

export function requireAccountantPermission(
  permission: 'canCreatePO' | 'canSubmitPO' | 'canReviewExpenses' | 'canViewWages' | 'canRecordPayments'
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    // Admins always have access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (req.user.role === 'ACCOUNTANT') {
      if (req.user.accountantProfile && req.user.accountantProfile[permission]) {
        return next();
      }
      return res.status(403).json({
        error: `Permission denied. Accountant lacks '${permission}' authorization.`,
      });
    }

    return res.status(403).json({ error: 'Access denied' });
  };
}

