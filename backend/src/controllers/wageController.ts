import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

export async function getWages(req: AuthRequest, res: Response) {
  try {
    const { payPeriod, status, department, search } = req.query;

    // Check accountant permission
    if (req.user?.role === 'ACCOUNTANT' && !req.user.accountantProfile?.canViewWages) {
      return res.status(403).json({ error: 'Permission denied: Cannot view confidential wage records' });
    }

    const where: any = {};
    if (payPeriod && payPeriod !== 'All') {
      where.payPeriod = payPeriod as string;
    }
    if (status && status !== 'All') {
      where.status = status as any;
    }
    if (department && department !== 'All') {
      where.employee = { department: department as string };
    }
    if (search) {
      where.employee = {
        OR: [
          { fullName: { contains: search as string, mode: 'insensitive' } },
          { employeeId: { contains: search as string, mode: 'insensitive' } },
          { department: { contains: search as string, mode: 'insensitive' } },
        ],
      };
    }

    const [wageRecords, allRecords, activeEmployees] = await Promise.all([
      prisma.employeeWageRecord.findMany({
        where,
        include: {
          employee: true,
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.employeeWageRecord.findMany(),
      prisma.employee.findMany({ where: { status: 'ACTIVE' } }),
    ]);

    // Financial calculations
    const totalPayable = allRecords.reduce((sum, r) => sum + Number(r.netPayable), 0);
    const totalPaid = allRecords.reduce((sum, r) => sum + Number(r.amountPaid), 0);
    const pendingSalary = totalPayable - totalPaid;

    const monthlyCommitment = activeEmployees
      .filter((e) => e.wageType === 'MONTHLY')
      .reduce((sum, e) => sum + Number(e.baseWageRate), 0);

    const formatted = wageRecords.map((r) => ({
      id: r.id,
      employeeId: r.employee.employeeId,
      employeeName: r.employee.fullName,
      department: r.employee.department,
      designation: r.employee.designation,
      wageType: r.wageType,
      wageRate: Number(r.wageRate),
      payPeriod: r.payPeriod,
      workedUnits: r.workedUnits ? Number(r.workedUnits) : null,
      grossAmount: Number(r.grossAmount),
      deductions: Number(r.deductions),
      deductionNotes: r.deductionNotes,
      netPayable: Number(r.netPayable),
      amountPaid: Number(r.amountPaid),
      balanceRemaining: Number(r.balanceRemaining),
      status: r.status,
      paymentsCount: r.payments.length,
      latestPaymentDate: r.payments[0]?.paymentDate || null,
      payments: r.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef,
        notes: p.notes,
        receiptNumber: p.receiptNumber,
      })),
    }));

    return res.json({
      summary: {
        totalEmployees: activeEmployees.length,
        activeEmployees: activeEmployees.length,
        monthlyCommitment,
        totalPayable,
        salaryPaid: totalPaid,
        pendingSalary,
      },
      wages: formatted,
    });
  } catch (error) {
    console.error('Error fetching wages:', error);
    return res.status(500).json({ error: 'Failed to fetch wage records' });
  }
}

function parsePayPeriodMonthYear(payPeriod: string): string {
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const parts = payPeriod.toLowerCase().trim().split(/\s+/);
  if (parts.length >= 2) {
    const mIdx = months.findIndex((m) => parts[0].startsWith(m.slice(0, 3)));
    const y = parts[1];
    if (mIdx !== -1 && y.length === 4) {
      return `${y}-${String(mIdx + 1).padStart(2, '0')}`;
    }
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function generateWagePeriod(req: AuthRequest, res: Response) {
  try {
    const { payPeriod } = req.body;

    if (!payPeriod) {
      return res.status(400).json({ error: 'Pay period is required (e.g. November 2026)' });
    }

    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
    });

    if (activeEmployees.length === 0) {
      return res.status(400).json({ error: 'No active employees found to generate wages' });
    }

    let createdCount = 0;
    const monthYear = parsePayPeriodMonthYear(payPeriod);

    for (const emp of activeEmployees) {
      // Check if wage record for this period already exists
      const exists = await prisma.employeeWageRecord.findFirst({
        where: {
          employeeId: emp.id,
          payPeriod,
        },
      });

      if (!exists) {
        const gross = Number(emp.baseWageRate);

        // Fetch approved or pending attendance deductions for this period
        const deductionsList = await prisma.attendanceSalaryDeduction.findMany({
          where: {
            employeeId: emp.id,
            payPeriodMonthYear: monthYear,
            status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
          },
        });

        const totalDeductions = deductionsList.reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
        const net = Math.max(0, gross - totalDeductions);
        const deductionNotes =
          totalDeductions > 0
            ? `Includes ₹${totalDeductions} late arrival penalty deductions (${deductionsList.length} instances)`
            : null;

        const newWage = await prisma.employeeWageRecord.create({
          data: {
            employeeId: emp.id,
            payPeriod,
            wageType: emp.wageType,
            wageRate: emp.baseWageRate,
            grossAmount: gross,
            deductions: totalDeductions,
            deductionNotes,
            netPayable: net,
            amountPaid: 0,
            balanceRemaining: net,
            status: 'PENDING',
          },
        });

        // Link and mark attendance deduction records as applied
        if (deductionsList.length > 0) {
          await prisma.attendanceSalaryDeduction.updateMany({
            where: {
              id: { in: deductionsList.map((d) => d.id) },
            },
            data: {
              wageRecordId: newWage.id,
              status: 'APPLIED_TO_PAYROLL',
            },
          });
        }

        createdCount++;
      }
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'WAGE_PERIOD_GENERATED',
      entityType: 'WAGES',
      details: `Generated wage records for period '${payPeriod}' (${createdCount} created)`,
      ipAddress: req.ip,
    });

    return res.json({
      message: `Generated wage records for ${payPeriod}. Created: ${createdCount}`,
      payPeriod,
    });
  } catch (error) {
    console.error('Error generating wage period:', error);
    return res.status(500).json({ error: 'Failed to generate wage period' });
  }
}

export async function recordWagePayment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMethod = 'Bank Transfer', transactionRef, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'A valid positive payment amount is required' });
    }

    if (!transactionRef) {
      return res.status(400).json({ error: 'Verifiable transaction reference number is required' });
    }

    const wageRecord = await prisma.employeeWageRecord.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!wageRecord) {
      return res.status(404).json({ error: 'Wage record not found' });
    }

    const payAmount = Number(amount);
    const currentPaid = Number(wageRecord.amountPaid);
    const netPayable = Number(wageRecord.netPayable);
    const currentRemaining = Number(wageRecord.balanceRemaining);

    if (payAmount > currentRemaining + 0.01) {
      return res.status(400).json({
        error: `Payment amount (₹${payAmount}) cannot exceed remaining balance (₹${currentRemaining})`,
      });
    }

    const newAmountPaid = currentPaid + payAmount;
    const newBalance = Math.max(0, netPayable - newAmountPaid);
    const newStatus = newBalance <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

    // Unique Receipt Number: RCP/WAG/YYYY/XXX
    const year = new Date().getFullYear();
    const paymentCount = await prisma.wagePayment.count();
    const receiptNumber = `RCP/WAG/${year}/${String(paymentCount + 1).padStart(3, '0')}`;

    const [payment, updatedWage] = await prisma.$transaction([
      prisma.wagePayment.create({
        data: {
          wageRecordId: id,
          amount: payAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod,
          transactionRef,
          notes,
          recordedById: req.user!.id,
          receiptNumber,
        },
      }),
      prisma.employeeWageRecord.update({
        where: { id },
        data: {
          amountPaid: newAmountPaid,
          balanceRemaining: newBalance,
          status: newStatus,
        },
      }),
    ]);

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'WAGE_PAYMENT_RECORDED',
      entityType: 'WAGES',
      entityId: payment.id,
      details: `Paid ₹${payAmount} to ${wageRecord.employee.fullName} for ${wageRecord.payPeriod} (Ref: ${transactionRef}, Rcpt: ${receiptNumber})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      payment,
      updatedWage,
      message: `Payment of ₹${payAmount.toLocaleString('en-IN')} recorded successfully.`,
    });
  } catch (error) {
    console.error('Error recording wage payment:', error);
    return res.status(500).json({ error: 'Failed to record wage payment' });
  }
}

/**
 * Personal salary & wage records for the logged-in employee.
 * Strictly scoped to the authenticated user's own profile.
 */
export async function getMySalary(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: req.user.id },
          ...(req.user.email ? [{ email: { equals: req.user.email, mode: 'insensitive' as const } }] : []),
        ],
      },
      include: {
        wageRecords: {
          orderBy: { createdAt: 'desc' },
          include: {
            payments: {
              orderBy: { paymentDate: 'desc' },
            },
          },
        },
      },
    });

    if (!employee) {
      return res.json({
        hasProfile: false,
        mySalary: null,
      });
    }

    const records = employee.wageRecords || [];
    const totalGross = records.reduce((sum, r) => sum + Number(r.grossAmount || 0), 0);
    const totalDeductions = records.reduce((sum, r) => sum + Number(r.deductions || 0), 0);
    const totalNetPayable = records.reduce((sum, r) => sum + Number(r.netPayable || 0), 0);
    const totalPaid = records.reduce((sum, r) => sum + Number(r.amountPaid || 0), 0);
    const balanceRemaining = records.reduce((sum, r) => sum + Number(r.balanceRemaining || 0), 0);
    const latestRecord = records[0] || null;

    return res.json({
      hasProfile: true,
      mySalary: {
        id: employee.id,
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        designation: employee.designation,
        department: employee.department,
        wageType: employee.wageType,
        baseWageRate: Number(employee.baseWageRate || 0),
        status: employee.status,
        joiningDate: employee.joiningDate,
        totalGross,
        totalDeductions,
        totalNetPayable,
        totalPaid,
        balanceRemaining,
        latestPeriod: latestRecord?.payPeriod || null,
        latestStatus: latestRecord?.status || null,
        records: records.map((r) => ({
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
          payments: r.payments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            paymentDate: p.paymentDate,
            paymentMethod: p.paymentMethod,
            transactionRef: p.transactionRef,
            receiptNumber: p.receiptNumber,
            notes: p.notes,
          })),
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching personal employee salary:', error);
    return res.status(500).json({ error: 'Failed to fetch personal wage/salary information' });
  }
}


