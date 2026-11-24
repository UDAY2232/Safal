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

    // Summary calculations
    const totalEmployees = allEmployees.length;
    const activeEmployees = allEmployees.filter((e) => e.status === 'ACTIVE').length;
    const departments = Array.from(new Set(allEmployees.map((e) => e.department))).length;
    const monthlyCommitment = allEmployees
      .filter((e) => e.status === 'ACTIVE' && e.wageType === 'MONTHLY')
      .reduce((sum, e) => sum + Number(e.baseWageRate), 0);

    const formatted = employees.map((e) => {
      const activeToday = isEmployeeActiveToday(e);
      return {
        id: e.id,
        employeeId: e.employeeId,
        userId: e.userId || e.user?.id || null,
        fullName: e.fullName,
        email: e.email,
        phone: e.phone,
        department: e.department,
        designation: e.designation,
        joiningDate: e.joiningDate,
        wageType: e.wageType,
        baseWageRate: Number(e.baseWageRate),
        status: e.status, // preserve real employment status stored in DB
        hasAttendedToday: activeToday,
        attendanceToday: activeToday ? 'PRESENT' : 'NOT_MARKED',
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

/**
 * Generates sequential, collision-safe Employee ID: EMP-001, EMP-002, etc.
 * Finds the highest numerical sequence among existing employee IDs and increments.
 */
export async function generateNextEmployeeId(tx: any = prisma): Promise<string> {
  const existingEmployees = await tx.employee.findMany({
    select: { employeeId: true },
  });

  let maxSeq = 0;
  for (const emp of existingEmployees) {
    if (emp.employeeId) {
      const match = emp.employeeId.match(/EMP-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  let nextSeq = maxSeq + 1;
  while (true) {
    const candidate = `EMP-${String(nextSeq).padStart(3, '0')}`;
    const exists = await tx.employee.findUnique({
      where: { employeeId: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextSeq++;
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

    // Check if an employee with this email already exists
    const existingEmployee = await prisma.employee.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    if (existingEmployee) {
      return res.status(400).json({
        error: `An employee with email '${normalizedEmail}' already exists (${existingEmployee.fullName} - ${existingEmployee.employeeId})`,
      });
    }

    // Provision or Link Login User if password provided
    let userId: string | null = null;
    if (password && String(password).trim()) {
      const pwd = String(password).trim();
      if (pwd.length < 6) {
        return res.status(400).json({ error: 'Login password must be at least 6 characters' });
      }

      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });

      if (existingUser) {
        // Verify this user is not already assigned to another employee
        const assignedEmployee = await prisma.employee.findFirst({
          where: { userId: existingUser.id },
        });
        if (assignedEmployee) {
          return res.status(400).json({
            error: `User account '${normalizedEmail}' is already assigned to employee ${assignedEmployee.fullName} (${assignedEmployee.employeeId})`,
          });
        }

        // Update password and profile details for the existing user
        const passwordHash = await bcrypt.hash(pwd, 10);
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            passwordHash,
            name: fullName.trim(),
            role: 'EMPLOYEE',
            phone: phone ? String(phone).trim() : existingUser.phone,
            department: department || existingUser.department,
            designation: designation ? String(designation).trim() : existingUser.designation,
            isActive: true,
          },
        });
        userId = existingUser.id;
      } else {
        const passwordHash = await bcrypt.hash(pwd, 10);
        const newUser = await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: fullName.trim(),
            role: 'EMPLOYEE',
            phone: phone ? String(phone).trim() : null,
            department: department || null,
            designation: designation ? String(designation).trim() : null,
            isActive: true,
          },
        });
        userId = newUser.id;
      }
    } else {
      // If password wasn't provided, check if a user with this email already exists unlinked
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      });
      if (existingUser) {
        const assignedEmployee = await prisma.employee.findFirst({
          where: { userId: existingUser.id },
        });
        if (!assignedEmployee) {
          userId = existingUser.id;
        }
      }
    }

    // Auto-generate employeeId safely with zero collision risk
    const employeeId = await generateNextEmployeeId();

    const newEmployee = await prisma.employee.create({
      data: {
        employeeId,
        userId,
        fullName: fullName.trim(),
        email: normalizedEmail,
        phone: phone ? String(phone).trim() : null,
        department,
        designation: String(designation).trim(),
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
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to create employee',
      code: error?.code,
    });
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

    const existing = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : undefined;

    // Check if new email is already used by another employee
    if (cleanEmail && cleanEmail !== existing.email.toLowerCase()) {
      const duplicateEmp = await prisma.employee.findFirst({
        where: {
          email: { equals: cleanEmail, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (duplicateEmp) {
        return res.status(400).json({
          error: `Email ${cleanEmail} is already used by employee ${duplicateEmp.fullName} (${duplicateEmp.employeeId})`,
        });
      }
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        fullName: fullName ? String(fullName).trim() : undefined,
        email: cleanEmail,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
        department: department || undefined,
        designation: designation ? String(designation).trim() : undefined,
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
        user: true,
      },
    });

    // Sync or Provision login User account
    const targetEmail = cleanEmail || existing.email.toLowerCase().trim();
    const hasPassword = Boolean(password && String(password).trim().length >= 6);

    // 1. If employee already has a linked user
    if (existing.userId) {
      const userData: any = {};
      if (fullName) userData.name = String(fullName).trim();
      if (cleanEmail) userData.email = cleanEmail;
      if (department) userData.department = department;
      if (designation) userData.designation = String(designation).trim();
      if (hasPassword) {
        userData.passwordHash = await bcrypt.hash(String(password).trim(), 10);
      }
      if (status) {
        userData.isActive = status === 'ACTIVE';
      }
      if (Object.keys(userData).length > 0) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: userData,
        });
      }
    } else {
      // 2. Employee does not have userId set. Check if a User with targetEmail already exists.
      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: targetEmail, mode: 'insensitive' } },
      });

      if (existingUser) {
        // Link employee to this existing user!
        await prisma.employee.update({
          where: { id },
          data: { userId: existingUser.id },
        });

        const userData: any = {
          name: updated.fullName,
          department: updated.department,
          designation: updated.designation,
        };
        if (hasPassword) {
          userData.passwordHash = await bcrypt.hash(String(password).trim(), 10);
        }
        if (status) {
          userData.isActive = status === 'ACTIVE';
        }
        await prisma.user.update({
          where: { id: existingUser.id },
          data: userData,
        });
      } else if (hasPassword) {
        // Create new user account and link to employee
        const passwordHash = await bcrypt.hash(String(password).trim(), 10);
        const newUser = await prisma.user.create({
          data: {
            name: updated.fullName,
            email: targetEmail,
            passwordHash,
            role: 'EMPLOYEE',
            department: updated.department,
            designation: updated.designation,
            isActive: status !== 'INACTIVE',
          },
        });
        await prisma.employee.update({
          where: { id },
          data: { userId: newUser.id },
        });
      }
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
  } catch (error: any) {
    console.error('Error updating employee:', error);
    return res.status(500).json({ error: error.message || 'Failed to update employee' });
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

