import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

// In-memory dashboard cache with 15s TTL to serve repeated dashboard clicks in < 1ms
interface CachedDashboard {
  data: any;
  expiry: number;
}
const dashboardMemoryCache = new Map<string, CachedDashboard>();

export function clearDashboardCache() {
  dashboardMemoryCache.clear();
}

export async function getAdminDashboard(req: AuthRequest, res: Response) {
  try {
    const isEmp = req.user?.role === 'EMPLOYEE';
    const cacheKey = `${req.user?.id || 'anon'}:${req.user?.role || 'EMP'}`;
    const cached = dashboardMemoryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return res.json(cached.data);
    }

    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const today = new Date(`${dateStr}T00:00:00.000Z`);

    let pos: any[] = [];
    let accountants: any[] = [];
    let employees: any[] = [];
    let wages: any[] = [];
    let expenses: any[] = [];
    let wagePayments: any[] = [];
    let expensePayments: any[] = [];
    let financialRecords: any[] = [];
    let auditLogs: any[] = [];
    let todayAttendances: any[] = [];
    let mySalary: any = null;

    if (isEmp) {
      // High-performance targeted queries for Employee console
      let myEmpRecord: any = null;
      [pos, expenses, todayAttendances, myEmpRecord] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where: { createdById: req.user!.id },
          include: { supplier: true, createdBy: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }).catch((err) => {
          console.warn('[Dashboard] Error querying POs for employee:', err?.message);
          return [];
        }),
        prisma.expenseClaim.findMany({
          where: { employee: { userId: req.user!.id } },
          include: { employee: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }).catch((err) => {
          console.warn('[Dashboard] Error querying expenses for employee:', err?.message);
          return [];
        }),
        prisma.attendanceRecord.findMany({
          where: { date: today, userId: req.user!.id },
          include: { user: true },
        }).catch((err) => {
          console.warn('[Dashboard] Error querying attendance for employee:', err?.message);
          return [];
        }),
        prisma.employee.findFirst({
          where: {
            OR: [
              { userId: req.user!.id },
              ...(req.user?.email ? [{ email: { equals: req.user.email, mode: 'insensitive' as const } }] : []),
            ],
          },
          include: {
            wageRecords: {
              orderBy: { createdAt: 'desc' },
              take: 12,
              include: {
                payments: {
                  orderBy: { paymentDate: 'desc' },
                },
              },
            },
          },
        }).catch((err) => {
          console.warn('[Dashboard] Error querying employee profile:', err?.message);
          return null;
        }),
      ]);

      if (myEmpRecord) {
        const records = myEmpRecord.wageRecords || [];
        const totalGross = records.reduce((sum: number, r: any) => sum + Number(r.grossAmount || 0), 0);
        const totalDeductions = records.reduce((sum: number, r: any) => sum + Number(r.deductions || 0), 0);
        const totalNetPayable = records.reduce((sum: number, r: any) => sum + Number(r.netPayable || 0), 0);
        const totalPaid = records.reduce((sum: number, r: any) => sum + Number(r.amountPaid || 0), 0);
        const balanceRemaining = records.reduce((sum: number, r: any) => sum + Number(r.balanceRemaining || 0), 0);
        const latestRecord = records[0] || null;

        mySalary = {
          id: myEmpRecord.id,
          employeeId: myEmpRecord.employeeId,
          fullName: myEmpRecord.fullName,
          designation: myEmpRecord.designation,
          department: myEmpRecord.department,
          wageType: myEmpRecord.wageType,
          baseWageRate: Number(myEmpRecord.baseWageRate || 0),
          status: myEmpRecord.status,
          joiningDate: myEmpRecord.joiningDate,
          totalGross,
          totalDeductions,
          totalNetPayable,
          totalPaid,
          balanceRemaining,
          latestPeriod: latestRecord?.payPeriod || null,
          latestStatus: latestRecord?.status || null,
          records: records.map((r: any) => ({
            id: r.id,
            payPeriod: r.payPeriod,
            wageType: r.wageType,
            wageRate: Number(r.wageRate),
            workedUnits: r.workedUnits ? Number(r.workedUnits) : null,
            grossAmount: Number(r.grossAmount),
            deductions: Number(r.deductions),
            deductionNotes: r.deductionNotes,
            netPayable: Number(r.netPayable),
            amountPaid: Number(r.amountPaid),
            balanceRemaining: Number(r.balanceRemaining),
            status: r.status,
            payments: (r.payments || []).map((p: any) => ({
              id: p.id,
              amount: Number(p.amount),
              paymentDate: p.paymentDate,
              paymentMethod: p.paymentMethod,
              transactionRef: p.transactionRef,
              receiptNumber: p.receiptNumber,
              notes: p.notes,
            })),
          })),
        };
      }
    } else {
      [
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
          include: { supplier: true, createdBy: true, items: true },
          orderBy: { createdAt: 'desc' },
        }).catch((err) => {
          console.warn('[Dashboard] Error querying POs:', err?.message);
          return [];
        }),
        prisma.accountantProfile.findMany({
          include: { user: true },
        }).catch((err) => {
          console.warn('[Dashboard] Error querying accountants:', err?.message);
          return [];
        }),
        prisma.employee.findMany({
          include: { user: true },
        }).catch((err) => {
          console.warn('[Dashboard] Error querying employees:', err?.message);
          return [];
        }),
        prisma.employeeWageRecord.findMany().catch((err) => {
          console.warn('[Dashboard] Error querying wages:', err?.message);
          return [];
        }),
        prisma.expenseClaim.findMany({
          include: { employee: true },
          orderBy: { createdAt: 'desc' },
        }).catch((err) => {
          console.warn('[Dashboard] Error querying expenses:', err?.message);
          return [];
        }),
        prisma.wagePayment.findMany().catch((err) => {
          console.warn('[Dashboard] Error querying wage payments:', err?.message);
          return [];
        }),
        prisma.expensePayment.findMany().catch((err) => {
          console.warn('[Dashboard] Error querying expense payments:', err?.message);
          return [];
        }),
        prisma.purchaseOrderFinancialRecord.findMany().catch((err) => {
          console.warn('[Dashboard] Error querying financial records:', err?.message);
          return [];
        }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
        }).catch((err) => {
          console.warn('[Dashboard] Error querying audit logs:', err?.message);
          return [];
        }),
        prisma.attendanceRecord.findMany({
          where: { date: today },
          include: { user: true },
        }).catch((err) => {
          console.warn('[Dashboard] Error querying attendance records:', err?.message);
          return [];
        }),
      ]);
    }

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
    const displayPOs = isEmp ? pos.filter((p) => p.createdById === req.user?.id) : pos;
    const displayExpenses = isEmp ? expenses.filter((e) => e.employee?.userId === req.user?.id) : expenses;

    // Strict Separation: Separate Purchase Orders (PO) from Customer Dues (CD)
    const isCD = (p: any) => p.poNumber?.startsWith('CD/') || p.supplier?.category === 'Customer Due';
    const isOrderRejected = (p: any) => p.status === 'REJECTED' || Boolean(p.rejectionReason && String(p.rejectionReason).trim() !== '');
    const poOrders = displayPOs.filter((p) => !isCD(p));
    const cdOrders = displayPOs.filter((p) => isCD(p));

    // PO Calculations (Strictly POs only, excluding rejected orders from open counts and commitment sums)
    const totalPOs = poOrders.length;
    const openPOs = poOrders.filter((p) => {
      if (isOrderRejected(p)) return false;
      const adv = Number(p.advanceAmount || 0);
      const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
      return p.status === 'OPEN' || (pending > 0 && p.status === 'CLOSED');
    }).length;
    const closedPOs = poOrders.filter((p) => {
      if (isOrderRejected(p)) return false;
      const adv = Number(p.advanceAmount || 0);
      const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
      return p.status === 'CLOSED' && pending <= 0;
    }).length;
    const pendingApprovalPOs = poOrders.filter((p) => !isOrderRejected(p) && p.status === 'PENDING_APPROVAL').length;
    const pendingApprovalCDs = cdOrders.filter((p) => !isOrderRejected(p) && p.status === 'PENDING_APPROVAL').length;
    const totalPendingApprovals = pendingApprovalPOs + pendingApprovalCDs;
    const totalPOAmount = poOrders.filter((p) => !isOrderRejected(p)).reduce((sum, p) => sum + Number(p.grandTotal), 0);

    // Customer Due (CD) Calculations (Strictly CDs only)
    const totalCDs = cdOrders.length;
    const openCDs = cdOrders.filter((p) => {
      if (isOrderRejected(p)) return false;
      const adv = Number(p.advanceAmount || 0);
      const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
      return p.status === 'OPEN' || (pending > 0 && p.status === 'CLOSED');
    }).length;
    const closedCDs = cdOrders.filter((p) => {
      if (isOrderRejected(p)) return false;
      const adv = Number(p.advanceAmount || 0);
      const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
      return p.status === 'CLOSED' && pending <= 0;
    }).length;
    const totalCDAmount = cdOrders.filter((p) => !isOrderRejected(p)).reduce((sum, p) => sum + Number(p.grandTotal), 0);
    const totalCDDue = cdOrders.filter((p) => !isOrderRejected(p)).reduce((sum, p) => {
      const adv = Number(p.advanceAmount || 0);
      const grand = Number(p.grandTotal || 0);
      const pending = p.status === 'CLOSED' && Number(p.pendingAmount || 0) === 0 ? 0 : Math.max(0, grand - adv);
      return sum + pending;
    }, 0);

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
      Rejected: pos.filter((p) => isOrderRejected(p)).length,
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

    const responsePayload = {
      summary: {
        totalPOs,
        openPOs,
        closedPOs,
        totalPOAmount,
        totalCDs,
        openCDs,
        closedCDs,
        totalCDAmount,
        totalCDDue,
        pendingApprovals: totalPendingApprovals,
        pendingPOApprovalsCount: pendingApprovalPOs,
        pendingCDApprovalsCount: pendingApprovalCDs,
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
      recentPOs: poOrders.slice(0, 8).map((p) => {
        const adv = Number(p.advanceAmount || 0);
        const grand = Number(p.grandTotal || 0);
        const pending = (p.status === 'CLOSED' && Number(p.pendingAmount || 0) === 0) ? 0 : Math.max(0, grand - adv);
        const staffMatch = p.notes?.match(/Order Taken By:\s*([^|\n]+)/);
        return {
          id: p.id,
          number: p.poNumber,
          supplier: p.supplier?.name || 'Party / Supplier',
          date: p.poDate,
          amount: grand,
          advanceAmount: adv,
          pendingAmount: pending,
          status: (pending > 0 && p.status === 'CLOSED') ? 'OPEN' : p.status,
          createdBy: staffMatch ? staffMatch[1].trim() : (p.createdBy?.name || 'User'),
          items: (p.items || []).map((i: any) => ({
            fruitName: i.fruitName,
            varietyGrade: i.varietyGrade,
            quantity: Number(i.quantity),
            unit: i.unit,
          })),
        };
      }),
      recentCDs: cdOrders.slice(0, 8).map((p) => {
        const adv = Number(p.advanceAmount || 0);
        const grand = Number(p.grandTotal || 0);
        const pending = (p.status === 'CLOSED' && Number(p.pendingAmount || 0) === 0) ? 0 : Math.max(0, grand - adv);
        const staffMatch = p.notes?.match(/Order Taken By:\s*([^|\n]+)/);
        return {
          id: p.id,
          number: p.poNumber,
          supplier: p.supplier?.name || 'Customer / Buyer',
          date: p.poDate,
          amount: grand,
          advanceAmount: adv,
          pendingAmount: pending,
          status: (pending > 0 && p.status === 'CLOSED') ? 'OPEN' : p.status,
          createdBy: staffMatch ? staffMatch[1].trim() : (p.createdBy?.name || 'User'),
        };
      }),
      pendingPOApprovals: displayPOs
        .filter((p) => p.status === 'PENDING_APPROVAL')
        .slice(0, 10)
        .map((p) => {
          const adv = Number(p.advanceAmount || 0);
          const grand = Number(p.grandTotal || 0);
          const pending = Math.max(0, grand - adv);
          const staffMatch = p.notes?.match(/Order Taken By:\s*([^|\n]+)/);
          return {
            id: p.id,
            number: p.poNumber,
            supplier: p.supplier?.name || (isCD(p) ? 'Buyer / Customer' : 'Supplier'),
            date: p.poDate,
            amount: grand,
            advanceAmount: adv,
            pendingAmount: pending,
            isCD: isCD(p),
            createdBy: staffMatch ? staffMatch[1].trim() : (p.createdBy?.name || 'User'),
          };
        }),
      recentExpenses: displayExpenses.slice(0, 10).map((e) => ({
        id: e.id,
        claim: e.claimNumber,
        claimNumber: e.claimNumber,
        employee: e.employee?.fullName || 'Employee',
        employeeName: e.employee?.fullName || 'Employee',
        employeeId: e.employee?.employeeId || '',
        department: e.employee?.department || 'Operations',
        category: e.category,
        description: e.description,
        businessPurpose: e.businessPurpose,
        travelFrom: e.travelFrom,
        travelTo: e.travelTo,
        date: e.expenseDate,
        expenseDate: e.expenseDate,
        amount: Number(e.amountSpent),
        amountSpent: Number(e.amountSpent),
        approved: Number(e.approvedAmount),
        approvedAmount: Number(e.approvedAmount),
        amountPaid: Number(e.amountPaid),
        balanceRemaining: Number(e.balanceRemaining),
        paymentMethodUsed: e.paymentMethodUsed,
        receiptUrl: e.receiptUrl,
        status: e.status,
      })),
      recentActivityLogs: auditLogs,
      mySalary,
    };

    dashboardMemoryCache.set(cacheKey, { data: responsePayload, expiry: Date.now() + 15000 });
    return res.json(responsePayload);
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

export async function getAllUsers(req: AuthRequest, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        designation: true,
        phone: true,
        isActive: true,
        createdAt: true,
        employee: {
          select: {
            employeeId: true,
            fullName: true,
            designation: true,
            department: true,
          },
        },
        accountantProfile: {
          select: {
            accountantId: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { name: 'asc' },
      ],
    });
    return res.json(users);
  } catch (error) {
    console.error('Failed to get all users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

