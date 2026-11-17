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

    const [employees, allEmployees] = await Promise.all([
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
        },
        orderBy: { employeeId: 'asc' },
      }),
      prisma.employee.findMany(),
    ]);

    // Summary calculations
    const totalEmployees = allEmployees.length;
    const activeEmployees = allEmployees.filter((e) => e.status === 'ACTIVE').length;
    const departments = Array.from(new Set(allEmployees.map((e) => e.department))).length;
    const monthlyCommitment = allEmployees
      .filter((e) => e.status === 'ACTIVE' && e.wageType === 'MONTHLY')
      .reduce((sum, e) => sum + Number(e.baseWageRate), 0);

    const formatted = employees.map((e) => ({
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
      status: e.status,
      totalClaims: e.expenseClaims.length,
      latestWageRecord: e.wageRecords[0]
        ? {
            payPeriod: e.wageRecords[0].payPeriod,
            netPayable: Number(e.wageRecords[0].netPayable),
            status: e.wageRecords[0].status,
          }
        : null,
    }));

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
    } = req.body;

    const updated = await prisma.employee.update({
      where: { id },
      data: {
        fullName,
        email: email ? email.toLowerCase().trim() : undefined,
        phone,
        department,
        designation,
        wageType,
        baseWageRate: baseWageRate !== undefined ? Number(baseWageRate) : undefined,
        status,
      },
    });

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

