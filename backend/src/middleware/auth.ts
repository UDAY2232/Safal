import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import { prisma } from '../config/db.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE' | 'VENDOR';
  department?: string | null;
  designation?: string | null;
  accountantProfile?: {
    id: string;
    accountantId: string;
    canCreatePO: boolean;
    canSubmitPO: boolean;
    canReviewExpenses: boolean;
    canViewWages: boolean;
    canRecordPayments: boolean;
  } | null;
  employee?: {
    id: string;
    employeeId: string;
    fullName?: string;
    department: string;
    designation: string;
    wageType?: string;
    baseWageRate?: number;
    status?: string;
  } | null;
  vendorProfile?: {
    id: string;
    vendorId: string;
    businessName: string;
    primaryLocation: string;
    isKycLocked: boolean;
    status?: string;
  } | null;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token && typeof req.query?.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role?: string;
      pwdSig?: string;
    };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        accountantProfile: true,
        employee: true,
        vendorProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Strict Password Signature Validation:
    // Ensure token matches the user's CURRENT password hash.
    // When password is changed/reset, all tokens created with the old password are revoked immediately.
    const currentPwdSig = user.passwordHash ? user.passwordHash.slice(-10) : '';
    if (!decoded.pwdSig || decoded.pwdSig !== currentPwdSig) {
      return res.status(401).json({
        error: 'SESSION_REVOKED',
        message: 'Your session has been terminated because the password was changed. Please log in again with your new password.',
      });
    }

    if (!user.isActive || (user.role === 'VENDOR' && user.vendorProfile?.status === 'SUSPENDED')) {
      if (user.role === 'VENDOR') {
        return res.status(403).json({
          error: 'SERVER_UNDER_MAINTENANCE',
          message: 'Server Under Maintenance. The vendor procurement portal is temporarily under scheduled maintenance. Please contact Safal Administration.',
          underMaintenance: true,
          isSuspended: true,
        });
      }
      return res.status(401).json({ error: 'User is inactive' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE' | 'VENDOR',
      department: user.department,
      designation: user.designation,
      accountantProfile: user.accountantProfile,
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeId: user.employee.employeeId,
            fullName: user.employee.fullName,
            department: user.employee.department,
            designation: user.employee.designation,
            wageType: user.employee.wageType,
            baseWageRate: Number(user.employee.baseWageRate || 0),
            status: user.employee.status,
          }
        : null,
      vendorProfile: user.vendorProfile
        ? {
            id: user.vendorProfile.id,
            vendorId: user.vendorProfile.vendorId,
            businessName: user.vendorProfile.businessName,
            primaryLocation: user.vendorProfile.primaryLocation,
            isKycLocked: user.vendorProfile.isKycLocked,
            status: user.vendorProfile.status,
          }
        : null,
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

