import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/jwt.js';
import { createAuditLog } from '../services/auditService.js';
import { AuthRequest } from '../middleware/auth.js';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const loginIdentifier = email.trim();
    const cleanEmail = loginIdentifier.toLowerCase();
    const cleanPassword = typeof password === 'string' ? password.trim() : password;
    const isVendorId = /^VND-\d+$/i.test(loginIdentifier);
    const isEmployeeId = /^EMP-\d+$/i.test(loginIdentifier);

    // Support common aliases/typos for admin (safal vs safel, 'admin', 'shanker')
    const emailVariants = [cleanEmail];
    if (cleanEmail === 'safalexportandimportpvtltd@gmail.com') {
      emailVariants.push('safelexportandimportpvtltd@gmail.com');
    } else if (cleanEmail === 'safelexportandimportpvtltd@gmail.com') {
      emailVariants.push('safalexportandimportpvtltd@gmail.com');
    }

    const emailConditions = emailVariants.flatMap((em) => [
      { email: em },
      { email: { equals: em, mode: 'insensitive' as const } },
    ]);

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...emailConditions,
          ...(cleanEmail === 'admin' || cleanEmail === 'shanker' ? [{ role: 'ADMIN' as const }] : []),
          ...(isVendorId ? [{ vendorProfile: { vendorId: loginIdentifier.toUpperCase() } }] : []),
          ...(isEmployeeId ? [{ employee: { employeeId: loginIdentifier.toUpperCase() } }] : []),
          { phone: loginIdentifier },
        ],
      },
      include: {
        accountantProfile: true,
        employee: true,
        vendorProfile: true,
      },
    });

    if (!user) {
      await createAuditLog({
        userName: email,
        userRole: 'UNKNOWN',
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        details: 'User not found',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isVendorSuspended =
      user.role === 'VENDOR' &&
      (user.vendorProfile?.status === 'SUSPENDED' || !user.isActive);

    if (isVendorSuspended) {
      await createAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        details: 'Suspended vendor login attempt - Server Under Maintenance',
        ipAddress: req.ip,
      });
      return res.status(403).json({
        error: 'SERVER_UNDER_MAINTENANCE',
        message: 'Server Under Maintenance. The vendor procurement portal is temporarily under scheduled maintenance. Please contact Safal Administration.',
        underMaintenance: true,
        isSuspended: true,
      });
    }

    if (!user.isActive) {
      await createAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        details: 'Account is deactivated',
        ipAddress: req.ip,
      });
      return res.status(403).json({ error: 'Account has been deactivated. Please contact Admin.' });
    }

    // Comprehensive password verification:
    // 1. Direct compare
    let isMatch = await bcrypt.compare(password, user.passwordHash);

    // 2. Trimmed compare if different
    if (!isMatch && cleanPassword !== password) {
      isMatch = await bcrypt.compare(cleanPassword, user.passwordHash);
    }

    // 3. Case-insensitive compare (in case CapsLock was on during entry or reset)
    if (!isMatch && typeof password === 'string') {
      isMatch =
        (await bcrypt.compare(password.toLowerCase(), user.passwordHash)) ||
        (await bcrypt.compare(password.toUpperCase(), user.passwordHash)) ||
        (await bcrypt.compare(cleanPassword.toLowerCase(), user.passwordHash)) ||
        (await bcrypt.compare(cleanPassword.toUpperCase(), user.passwordHash));
    }

    // 4. Admin override for requested reset password SHENKAR@SAFALCEO or default shenkar@palthya
    if (!isMatch && user.role === 'ADMIN') {
      const pUpper = cleanPassword.toUpperCase();
      if (pUpper === 'SHENKAR@SAFALCEO' || cleanPassword === 'shenkar@palthya') {
        isMatch = true;
        // Re-hash and save this new password immediately to ensure future standard comparisons pass
        try {
          const freshHash = await bcrypt.hash(cleanPassword, 10);
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: freshHash },
          });
          console.log(`[Auth] Admin password verified & synchronized for ${user.email}`);
        } catch (syncErr) {
          console.error('[Auth] Error synchronizing admin password:', syncErr);
        }
      }
    }

    if (!isMatch) {
      await createAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'FAILED_LOGIN',
        entityType: 'AUTH',
        details: 'Incorrect password entered',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as any,
    });

    await createAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      details: 'User logged in successfully',
      ipAddress: req.ip,
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        designation: user.designation,
        phone: user.phone,
        isActive: user.isActive,
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
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

export async function getCurrentUser(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        accountantProfile: true,
        employee: true,
        vendorProfile: true,
      },
    });

    if (user && user.role === 'VENDOR' && (user.vendorProfile?.status === 'SUSPENDED' || !user.isActive)) {
      return res.status(403).json({
        error: 'SERVER_UNDER_MAINTENANCE',
        message: 'Server Under Maintenance. The vendor procurement portal is temporarily under scheduled maintenance. Please contact Safal Administration.',
        underMaintenance: true,
        isSuspended: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: false,
          vendorProfile: user.vendorProfile
            ? {
                id: user.vendorProfile.id,
                vendorId: user.vendorProfile.vendorId,
                businessName: user.vendorProfile.businessName,
                status: 'SUSPENDED',
              }
            : null,
        },
      });
    }

    if (!user || !user.isActive) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        designation: user.designation,
        phone: user.phone,
        isActive: user.isActive,
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
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
}

export async function logout(req: AuthRequest, res: Response) {
  if (req.user) {
    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'LOGOUT',
      entityType: 'AUTH',
      details: 'User logged out',
      ipAddress: req.ip,
    });
  }
  return res.json({ message: 'Logged out successfully' });
}

export async function resetPassword(req: AuthRequest, res: Response) {
  try {
    const { userId, newPassword, currentPassword } = req.body;
    const targetUserId = userId || req.user?.id;

    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Role check: Only ADMIN can reset other users' passwords
    if (req.user?.role !== 'ADMIN' && req.user?.id !== targetUserId) {
      return res.status(403).json({ error: 'Unauthorized to reset password for other users' });
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If regular user, verify current password
    if (req.user?.role !== 'ADMIN' && req.user?.id === targetUserId) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current password does not match' });
      }
    }

    const cleanPassword = typeof newPassword === 'string' ? newPassword.trim() : '';
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);

    // Also normalize legacy email typo if resetting admin
    const updateData: any = { passwordHash: hashedPassword };
    if (user.role === 'ADMIN' && user.email === 'safelexportandimportpvtltd@gmail.com') {
      updateData.email = 'safalexportandimportpvtltd@gmail.com';
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'System',
      userRole: req.user?.role || 'SYSTEM',
      action: 'PASSWORD_RESET',
      entityType: 'USER',
      entityId: targetUserId,
      details: `Password reset for user ${user.email}`,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}
