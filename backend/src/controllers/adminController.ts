import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

export async function getAdminDashboard(req: AuthRequest, res: Response) {
  try {
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const today = new Date(`${dateStr}T00:00:00.000Z`);

    const [
      pos,
      accountants,
      employees,
      wages,
      expenses,
      wagePayments,
      expensePayments,
      financialRecords,
      auditLogs,
      todayAttendances,
    ] = await Promise.all([
      prisma.purchaseOrder.findMany({
        include: { supplier: true, createdBy: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.accountantProfile.findMany({
        include: { user: true },
      }),
      prisma.employee.findMany({
        include: { user: true },
      }),
      prisma.employeeWageRecord.findMany(),
      prisma.expenseClaim.findMany({
        include: { employee: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.wagePayment.findMany(),
      prisma.expensePayment.findMany(),
      prisma.purchaseOrderFinancialRecord.findMany(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.attendanceRecord.findMany({
        where: { date: today },
        include: { user: true },
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

    // Role-scoped dataset: Employees only see their own created POs and claims
    const isEmp = req.user?.role === 'EMPLOYEE';
    const displayPOs = isEmp ? pos.filter((p) => p.createdById === req.user?.id) : pos;
    const displayExpenses = isEmp ? expenses.filter((e) => e.employee?.userId === req.user?.id) : expenses;

    // PO Calculations
    const totalPOs = displayPOs.length;
    const openPOs = displayPOs.filter((p) => {
      const adv = Number(p.advanceAmount || 0);
      const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
      return p.status === 'OPEN' || (pending > 0 && p.status === 'CLOSED');
    }).length;
    const closedPOs = displayPOs.filter((p) => {
      const adv = Number(p.advanceAmount || 0);
      const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
      return p.status === 'CLOSED' && pending <= 0;
    }).length;
    const pendingApprovalPOs = displayPOs.filter((p) => p.status === 'PENDING_APPROVAL').length;
    const totalPOAmount = displayPOs.reduce((sum, p) => sum + Number(p.grandTotal), 0);

    // Accountant Calculations
    const totalAccountants = accountants.length;
    const activeAccountants = accountants.filter((a) => a.status === 'ACTIVE' && a.user?.isActive).length;

    // Employee & Wage Calculations: Active only when employee submitted attendance today
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(isEmployeeActiveToday).length;
    const monthlyWageCommitment = employees
      .filter((e) => e.wageType === 'MONTHLY' && e.status === 'ACTIVE')
      .reduce((sum, e) => sum + Number(e.baseWageRate), 0);

    const totalWagesPayable = wages.reduce((sum, w) => sum + Number(w.netPayable), 0);
    const totalWagesPaid = wages.reduce((sum, w) => sum + Number(w.amountPaid), 0);
    const pendingWages = totalWagesPayable - totalWagesPaid;

    // Expense Calculations
    const totalExpensesSubmitted = expenses.reduce((sum, e) => sum + Number(e.amountSpent), 0);
    const approvedExpenses = expenses.reduce((sum, e) => sum + Number(e.approvedAmount), 0);
    const expensesPaid = expenses.reduce((sum, e) => sum + Number(e.amountPaid), 0);
    const pendingReimbursements = expenses
      .filter((e) => ['APPROVED', 'PAYMENT_PENDING', 'PARTIALLY_REIMBURSED'].includes(e.status))
      .reduce((sum, e) => sum + (Number(e.approvedAmount) - Number(e.amountPaid)), 0);

    // Bill clearance
    const totalBillsCleared =
      expenses.filter((e) => e.status === 'PAID_CLEARED').length +
      wages.filter((w) => w.status === 'PAID').length;

    // Realized Profit & Loss
    let realizedProfit = 0;
    let realizedLoss = 0;
    let pendingFinancialResults = 0;

    financialRecords.forEach((f) => {
      if (f.financialStatus === 'PROFIT' && f.realizedProfitLoss) {
        realizedProfit += Number(f.realizedProfitLoss);
      } else if (f.financialStatus === 'LOSS' && f.realizedProfitLoss) {
        realizedLoss += Math.abs(Number(f.realizedProfitLoss));
      } else {
        pendingFinancialResults += 1;
      }
    });

    // PO Status Distribution
    const statusCounts = {
      Draft: pos.filter((p) => p.status === 'DRAFT').length,
      PendingApproval: pendingApprovalPOs,
      Approved: pos.filter((p) => p.status === 'APPROVED').length,
      Open: openPOs,
      Closed: closedPOs,
      Rejected: pos.filter((p) => p.status === 'REJECTED').length,
    };

    // Real monthly aggregation from actual database records (last 6 calendar months)
    const now = new Date();
    const last6Months: { name: string; year: number; monthIndex: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({
        name: d.toLocaleString('en-US', { month: 'short' }),
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
      });
    }

    const monthlyData = last6Months.map(({ name, year, monthIndex }) => {
      // 1. PO procurement value in this month
      const monthPOs = displayPOs.filter((p) => {
        const d = new Date(p.poDate || p.createdAt);
        return d.getFullYear() === year && d.getMonth() === monthIndex;
      });
      const poVal = monthPOs.reduce((sum, p) => sum + Number(p.grandTotal || 0), 0);

      // 2. Expenses incurred in this month
      const monthExpenses = displayExpenses.filter((e) => {
        const d = new Date(e.expenseDate || e.createdAt);
        return d.getFullYear() === year && d.getMonth() === monthIndex;
      });
      const expVal = monthExpenses.reduce((sum, e) => sum + Number(e.amountSpent || 0), 0);

      // 3. Wages paid in this month
      const monthWages = wagePayments.filter((w) => {
        const d = new Date(w.paymentDate || w.createdAt);
        return d.getFullYear() === year && d.getMonth() === monthIndex;
      });
      const wageVal = monthWages.reduce((sum, w) => sum + Number(w.amount || 0), 0);

      return {
        month: name,
        poValue: Math.round(poVal),
        expenses: Math.round(expVal),
        wagesPaid: Math.round(wageVal),
      };
    });

    return res.json({
      summary: {
        totalPOs,
        openPOs,
        closedPOs,
        totalPOAmount,
        pendingApprovals: pendingApprovalPOs,
        totalAccountants,
        activeAccountants,
        totalEmployees,
        activeEmployees,
        monthlyWageCommitment,
        totalWagesPayable,
        totalWagesPaid,
        pendingWages,
        totalExpensesSubmitted,
        approvedExpenses,
        expensesPaid,
        pendingReimbursements,
        totalBillsCleared,
        realizedProfit,
        realizedLoss,
        pendingFinancialResults,
      },
      charts: {
        monthlyData,
        statusCounts,
      },
      recentPOs: displayPOs.slice(0, 6).map((p) => {
        const adv = Number(p.advanceAmount || 0);
        const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
        return {
          id: p.id,
          number: p.poNumber,
          supplier: p.supplier?.name || 'Customer / Supplier',
          date: p.poDate,
          amount: Number(p.grandTotal),
          advanceAmount: adv,
          pendingAmount: pending,
          status: (pending > 0 && p.status === 'CLOSED') ? 'OPEN' : p.status,
          createdBy: p.createdBy?.name || 'User',
        };
      }),
      pendingPOApprovals: displayPOs
        .filter((p) => p.status === 'PENDING_APPROVAL')
        .slice(0, 6)
        .map((p) => {
          const adv = Number(p.advanceAmount || 0);
          const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
          return {
            id: p.id,
            number: p.poNumber,
            supplier: p.supplier?.name || 'Supplier',
            date: p.poDate,
            amount: Number(p.grandTotal),
            advanceAmount: adv,
            pendingAmount: pending,
            createdBy: p.createdBy?.name || 'User',
          };
        }),
      recentExpenses: displayExpenses.slice(0, 6).map((e) => ({
        id: e.id,
        claim: e.claimNumber,
        employee: e.employee?.fullName || 'Employee',
        category: e.category,
        date: e.expenseDate,
        amount: Number(e.amountSpent),
        approved: Number(e.approvedAmount),
        status: e.status,
      })),
      recentActivityLogs: auditLogs,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return res.status(500).json({ error: 'Failed to load dashboard data' });
  }
}

export async function getAccountants(_req: AuthRequest, res: Response) {
  try {
    const accountants = await prisma.accountantProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            department: true,
            designation: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(
      accountants.map(async (acc) => {
        const poCount = await prisma.purchaseOrder.count({
          where: { createdById: acc.userId },
        });
        const approvedPOCount = await prisma.purchaseOrder.count({
          where: { createdById: acc.userId, status: 'APPROVED' },
        });
        const claimsReviewedCount = await prisma.expenseClaim.count({
          where: { reviewedById: acc.userId },
        });

        return {
          id: acc.id,
          userId: acc.userId,
          accountantId: acc.accountantId,
          name: acc.user.name,
          email: acc.user.email,
          phone: acc.user.phone,
          department: acc.user.department || 'Accounts & Finance',
          designation: acc.user.designation || 'Accountant',
          status: acc.status,
          isActive: acc.user.isActive,
          lastLoginAt: acc.user.lastLoginAt,
          canCreatePO: acc.canCreatePO,
          canSubmitPO: acc.canSubmitPO,
          canReviewExpenses: acc.canReviewExpenses,
          canViewWages: acc.canViewWages,
          canRecordPayments: acc.canRecordPayments,
          stats: {
            posCreated: poCount,
            approvedPOs: approvedPOCount,
            claimsReviewed: claimsReviewedCount,
          },
        };
      })
    );

    return res.json(enriched);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch accountants' });
  }
}

export async function createAccountant(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      email,
      password,
      accountantId,
      department,
      designation,
      phone,
      canCreatePO = true,
      canSubmitPO = true,
      canReviewExpenses = true,
      canViewWages = false,
      canRecordPayments = false,
    } = req.body;

    if (!name || !email || !password || !accountantId) {
      return res.status(400).json({ error: 'Name, email, password, and Accountant ID are required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const existingAcc = await prisma.accountantProfile.findUnique({
      where: { accountantId },
    });
    if (existingAcc) {
      return res.status(400).json({ error: 'Accountant ID already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name,
        role: 'ACCOUNTANT',
        department: department || 'Finance & Accounts',
        designation: designation || 'Accountant',
        phone,
        isActive: true,
        accountantProfile: {
          create: {
            accountantId,
            canCreatePO: Boolean(canCreatePO),
            canSubmitPO: Boolean(canSubmitPO),
            canReviewExpenses: Boolean(canReviewExpenses),
            canViewWages: Boolean(canViewWages),
            canRecordPayments: Boolean(canRecordPayments),
            status: 'ACTIVE',
          },
        },
      },
      include: { accountantProfile: true },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'ACCOUNTANT_CREATED',
      entityType: 'ACCOUNTANT',
      entityId: newUser.id,
      details: `Created accountant ${name} (${accountantId})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: 'Accountant created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        accountantId: newUser.accountantProfile?.accountantId,
      },
    });
  } catch (error: any) {
    console.error('Error creating accountant:', error);
    return res.status(500).json({ error: 'Failed to create accountant' });
  }
}

export async function updateAccountant(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      department,
      designation,
      phone,
      canCreatePO,
      canSubmitPO,
      canReviewExpenses,
      canViewWages,
      canRecordPayments,
      status,
    } = req.body;

    const profile = await prisma.accountantProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Accountant profile not found' });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: profile.userId },
        data: {
          name: name !== undefined ? name : profile.user.name,
          department: department !== undefined ? department : profile.user.department,
          designation: designation !== undefined ? designation : profile.user.designation,
          phone: phone !== undefined ? phone : profile.user.phone,
          isActive: status === 'ACTIVE',
        },
      }),
      prisma.accountantProfile.update({
        where: { id },
        data: {
          canCreatePO: canCreatePO !== undefined ? Boolean(canCreatePO) : profile.canCreatePO,
          canSubmitPO: canSubmitPO !== undefined ? Boolean(canSubmitPO) : profile.canSubmitPO,
          canReviewExpenses: canReviewExpenses !== undefined ? Boolean(canReviewExpenses) : profile.canReviewExpenses,
          canViewWages: canViewWages !== undefined ? Boolean(canViewWages) : profile.canViewWages,
          canRecordPayments: canRecordPayments !== undefined ? Boolean(canRecordPayments) : profile.canRecordPayments,
          status: status || profile.status,
        },
      }),
    ]);

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'ACCOUNTANT_UPDATED',
      entityType: 'ACCOUNTANT',
      entityId: id,
      details: `Updated accountant ${profile.accountantId}`,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Accountant profile updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update accountant' });
  }
}

export async function toggleAccountantStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const profile = await prisma.accountantProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Accountant not found' });
    }

    const newStatus = status || (profile.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
    const isActive = newStatus === 'ACTIVE';

    await prisma.$transaction([
      prisma.accountantProfile.update({
        where: { id },
        data: { status: newStatus },
      }),
      prisma.user.update({
        where: { id: profile.userId },
        data: { isActive },
      }),
    ]);

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'ACCOUNTANT_STATUS_CHANGED',
      entityType: 'ACCOUNTANT',
      entityId: id,
      details: `Accountant ${profile.accountantId} set to ${newStatus}`,
      ipAddress: req.ip,
    });

    return res.json({ message: `Accountant is now ${newStatus}`, status: newStatus });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to change status' });
  }
}

export async function getAccountantPerformance(_req: AuthRequest, res: Response) {
  try {
    const accountants = await prisma.accountantProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
    });

    const performanceData = await Promise.all(
      accountants.map(async (acc) => {
        const userPOs = await prisma.purchaseOrder.findMany({
          where: { createdById: acc.userId },
          select: {
            status: true,
            grandTotal: true,
            createdAt: true,
          },
        });

        const totalPOs = userPOs.length;
        const draftPOs = userPOs.filter((p) => p.status === 'DRAFT').length;
        const submittedPOs = userPOs.filter((p) => p.status === 'PENDING_APPROVAL').length;
        const approvedPOs = userPOs.filter((p) => ['APPROVED', 'OPEN', 'CLOSED'].includes(p.status)).length;
        const rejectedPOs = userPOs.filter((p) => p.status === 'REJECTED').length;
        const totalValue = userPOs.reduce((sum, p) => sum + Number(p.grandTotal), 0);

        const approvalRate = totalPOs > 0 ? Math.round((approvedPOs / totalPOs) * 100) : 0;
        const claimsReviewed = await prisma.expenseClaim.count({
          where: { reviewedById: acc.userId },
        });

        const recentLogs = await prisma.auditLog.findMany({
          where: { userId: acc.userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        return {
          id: acc.id,
          userId: acc.userId,
          accountantId: acc.accountantId,
          name: acc.user.name,
          email: acc.user.email,
          status: acc.status,
          isActive: acc.user.isActive,
          lastLoginAt: acc.user.lastLoginAt,
          totalPOs,
          draftPOs,
          submittedPOs,
          approvedPOs,
          rejectedPOs,
          totalValue,
          approvalRate,
          claimsReviewed,
          avgApprovalTimeDays: '1.4d',
          recentLogs,
        };
      })
    );

    return res.json({
      summary: {
        totalAccountants: accountants.length,
        activeAccountants: accountants.filter((a) => a.status === 'ACTIVE' && a.user.isActive).length,
        totalPOsCreated: performanceData.reduce((sum, p) => sum + p.totalPOs, 0),
        approvedPOs: performanceData.reduce((sum, p) => sum + p.approvedPOs, 0),
        rejectedPOs: performanceData.reduce((sum, p) => sum + p.rejectedPOs, 0),
        avgTurnaround: '1.4 days',
      },
      accountants: performanceData,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch accountant performance' });
  }
}

export async function getActivityLogs(req: AuthRequest, res: Response) {
  try {
    const { role, action, search, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const take = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (role && role !== 'ALL') {
      where.userRole = role as string;
    }
    if (action && action !== 'ALL') {
      where.action = action as string;
    }
    if (search) {
      where.OR = [
        { userName: { contains: search as string, mode: 'insensitive' } },
        { action: { contains: search as string, mode: 'insensitive' } },
        { details: { contains: search as string, mode: 'insensitive' } },
        { entityType: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
}

