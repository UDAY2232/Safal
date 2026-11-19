import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

export async function getEmployees(req: AuthRequest, res: Response) {
  try {
    const { search, department, wageType, status } = req.query;

    const where: any = {};
    if (department && department !== 'All') {
      where.department = department as string;
    }
    if (wageType && wageType !== 'All') {
      where.wageType = wageType as any;
    }
    if (status && status !== 'All') {
      where.status = status as string;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { employeeId: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { designation: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const today = new Date(`${dateStr}T00:00:00.000Z`);

    const [employees, allEmployees, todayAttendances] = await Promise.all([
      prisma.employee.findMany({
        where,
        include: {
          wageRecords: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          expenseClaims: {
            select: { id: true, amountSpent: true, status: true },
          },
          user: true,
        },
        orderBy: { employeeId: 'asc' },
      }),
      prisma.employee.findMany({
        include: { user: true },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          date: today,
        },
        include: {
          user: true,
        },
      }),
    ]);

    const attendedUserIds = new Set(todayAttendances.map((a) => a.userId));
    const attendedEmpIds = new Set(todayAttendances.filter((a) => a.employeeId).map((a) => a.employeeId!));
    const attendedEmails = new Set(
      todayAttendances
        .map((a) => a.user?.email?.toLowerCase())
        .filter(Boolean) as string[]
    );

    const isEmployeeActiveToday = (e: any) => {
      if (e.status !== 'ACTIVE') return false;
      const emailMatch = e.email && attendedEmails.has(e.email.toLowerCase());
      const idMatch = attendedEmpIds.has(e.id);
      const userMatch = e.userId && attendedUserIds.has(e.userId);
      return emailMatch || idMatch || userMatch;
    };

    // Summary calculations - Active only when attendance submitted today
    const totalEmployees = allEmployees.length;
    const activeEmployees = allEmployees.filter(isEmployeeActiveToday).length;
    const departments = Array.from(new Set(allEmployees.map((e) => e.department))).length;
    const monthlyCommitment = allEmployees
      .filter((e) => isEmployeeActiveToday(e) && e.wageType === 'MONTHLY')
      .reduce((sum, e) => sum + Number(e.baseWageRate), 0);

    const formatted = employees.map((e) => {
      const activeToday = isEmployeeActiveToday(e);
      return {
        id: e.id,
        employeeId: e.employeeId,
        fullName: e.fullName,
        email: e.email,
        phone: e.phone,
        department: e.department,
        designation: e.designation,
        joiningDate: e.joiningDate,
        wageType: e.wageType,
        baseWageRate: Number(e.baseWageRate),
        status: activeToday ? 'ACTIVE' : 'INACTIVE',
        hasAttendedToday: activeToday,
        totalClaims: e.expenseClaims.length,
        latestWageRecord: e.wageRecords[0]
          ? {
              payPeriod: e.wageRecords[0].payPeriod,
              netPayable: Number(e.wageRecords[0].netPayable),
              status: e.wageRecords[0].status,
            }
          : null,
      };
    });

    return res.json({
      summary: {
        totalEmployees,
        activeEmployees,
        departments,
        monthlyCommitment,
      },
      employees: formatted,
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return res.status(500).json({ error: 'Failed to fetch employees' });
  }
}

export async function getEmployeeById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        wageRecords: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
        expenseClaims: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
      },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    return res.json(employee);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch employee details' });
  }
}

export async function createEmployee(req: AuthRequest, res: Response) {
  try {
    const {
      fullName,
      email,
      phone,
      department,
      designation,
      wageType = 'MONTHLY',
      baseWageRate,
      joiningDate,
      password,
    } = req.body;

    if (!fullName || !email || !department || !designation || baseWageRate === undefined) {
      return res.status(400).json({
        error: 'Full name, email, department, designation, and base wage rate are required',
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    // Check if employee with email already exists
    const existingEmployee = await prisma.employee.findFirst({
      where: { email: normalizedEmail },
    });
    if (existingEmployee) {
      return res.status(400).json({ error: 'An employee with this email already exists' });
    }

    // Provision Login User if password provided
    let userId: string | null = null;
    if (password && String(password).trim()) {
      const pwd = String(password).trim();
      if (pwd.length < 6) {
        return res.status(400).json({ error: 'Login password must be at least 6 characters' });
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        userId = existingUser.id;
      } else {
        const passwordHash = await bcrypt.hash(pwd, 10);
        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: fullName.trim(),
            role: 'EMPLOYEE',
            isActive: true,
          },
        });
        userId = newUser.id;
      }
    }

    // Auto-generate employeeId: EMP-001
    const count = await prisma.employee.count();
    const employeeId = `EMP-${String(count + 1).padStart(3, '0')}`;

    const newEmployee = await prisma.employee.create({
      data: {
        employeeId,
        userId,
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone,
        department,
        designation,
        wageType,
        baseWageRate: Number(baseWageRate),
        joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
        status: 'ACTIVE',
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'EMPLOYEE_CREATED',
      entityType: 'EMPLOYEE',
      entityId: newEmployee.id,
      details: `Created employee ${newEmployee.fullName} (${newEmployee.employeeId})`,
      ipAddress: req.ip,
    });

    return res.status(201).json(newEmployee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return res.status(500).json({ error: 'Failed to create employee' });
  }
}

export async function updateEmployee(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      fullName,
      email,
      phone,
      department,
      designation,
      wageType,
      baseWageRate,
      status,
      joiningDate,
      password,
    } = req.body;

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : undefined;

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        fullName: fullName || undefined,
        email: cleanEmail,
        phone: phone !== undefined ? phone : undefined,
        department: department || undefined,
        designation: designation || undefined,
        wageType: wageType || undefined,
        baseWageRate: baseWageRate !== undefined && baseWageRate !== '' ? Number(baseWageRate) : undefined,
        status: status || undefined,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      },
      include: {
        wageRecords: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
        expenseClaims: {
          orderBy: { createdAt: 'desc' },
          include: { payments: true },
        },
      },
    });

    // Also sync User if linked
    if (existing.userId) {
      const userData: any = {};
      if (fullName) userData.name = fullName;
      if (cleanEmail) userData.email = cleanEmail;
      if (department) userData.department = department;
      if (designation) userData.designation = designation;
      if (password && String(password).trim().length >= 6) {
        userData.passwordHash = await bcrypt.hash(String(password).trim(), 10);
      }
      if (Object.keys(userData).length > 0) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: userData,
        });
      }
    } else if (password && String(password).trim().length >= 6 && cleanEmail) {
      const passwordHash = await bcrypt.hash(String(password).trim(), 10);
      const newUser = await prisma.user.create({
        data: {
          name: updated.fullName,
          email: updated.email,
          passwordHash,
          role: 'EMPLOYEE',
          department: updated.department,
          designation: updated.designation,
        },
      });
      await prisma.employee.update({
        where: { id },
        data: { userId: newUser.id },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'EMPLOYEE_UPDATED',
      entityType: 'EMPLOYEE',
      entityId: id,
      details: `Updated employee ${updated.employeeId} (${updated.fullName})`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ error: 'Failed to update employee' });
  }
}

export async function toggleEmployeeStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const nextStatus = employee.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await prisma.employee.update({
      where: { id },
      data: { status: nextStatus },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'EMPLOYEE_STATUS_CHANGED',
      entityType: 'EMPLOYEE',
      entityId: id,
      details: `Employee ${employee.employeeId} set to ${nextStatus}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to change employee status' });
  }
}

/**
 * DELETE /api/employees/:id
 * Relieve/remove an employee and permanently revoke/delete their login credentials
 */
export async function deleteEmployee(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id;

    // Find employee by id or employeeId
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id }, { employeeId: id }],
      },
      include: { user: true },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Find linked user credentials record
    let linkedUser = employee.user;
    if (!linkedUser && employee.email) {
      linkedUser = await prisma.user.findFirst({
        where: { email: { equals: employee.email, mode: 'insensitive' } },
      });
    }

    const empName = employee.fullName;
    const empCode = employee.employeeId;
    const empEmail = linkedUser?.email || employee.email;

    // 1. Reassign POs created or approved by this user to current Admin to preserve FK integrity
    if (linkedUser && adminId) {
      await prisma.purchaseOrder.updateMany({
        where: { createdById: linkedUser.id },
        data: { createdById: adminId },
      });
      await prisma.purchaseOrder.updateMany({
        where: { approvedById: linkedUser.id },
        data: { approvedById: adminId },
      });
    }

    // 2. Delete the employee record (cascades wage records and expense claims)
    await prisma.employee.delete({
      where: { id: employee.id },
    });

    // 3. Delete linked user credentials completely so they cannot log in again
    if (linkedUser) {
      await prisma.user.delete({
        where: { id: linkedUser.id },
      });
    }

    // 4. Create audit log
    await createAuditLog({
      userId: adminId,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'EMPLOYEE_REMOVED',
      entityType: 'EMPLOYEE',
      entityId: employee.id,
      details: `Relieved / Removed employee ${empCode} (${empName}, Email: ${empEmail}) and permanently deleted login credentials.`,
      ipAddress: req.ip,
    });

    return res.json({
      message: `Employee ${empName} (${empCode}) relieved and login credentials permanently removed.`,
      deletedId: employee.id,
    });
  } catch (error: any) {
    console.error('Failed to relieve/delete employee:', error);
    return res.status(500).json({ error: 'Failed to relieve employee', details: error.message });
  }
}

