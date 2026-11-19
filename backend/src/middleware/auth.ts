import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import { prisma } from '../config/db.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';
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
    department: string;
    designation: string;
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
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        accountantProfile: true,
        employee: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User is inactive or not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE',
      department: user.department,
      designation: user.designation,
      accountantProfile: user.accountantProfile,
      employee: user.employee
        ? {
            id: user.employee.id,
            employeeId: user.employee.employeeId,
            department: user.employee.department,
            designation: user.employee.designation,
          }
        : null,
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

