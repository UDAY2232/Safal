import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

export async function getClearanceBills(req: AuthRequest, res: Response) {
  try {
    const { type = 'ALL', status = 'ALL', search } = req.query;

    const [expenses, wages] = await Promise.all([
      prisma.expenseClaim.findMany({
        where: {
          status: {
            in: ['APPROVED', 'PAYMENT_PENDING', 'PARTIALLY_REIMBURSED', 'PAID_CLEARED'],
          },
        },
        include: {
          employee: true,
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.employeeWageRecord.findMany({
        include: {
          employee: true,
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Map into unified clearance items
    const expenseItems = expenses.map((e) => {
      const approved = Number(e.approvedAmount);
      const paid = Number(e.amountPaid);
      const balance = Number(e.balanceRemaining);
      const isCleared = e.status === 'PAID_CLEARED';
      const isPartial = e.status === 'PARTIALLY_REIMBURSED';

      return {
        id: e.id,
        billId: e.claimNumber,
        type: 'EXPENSE_REIMBURSEMENT',
        employeeId: e.employee.employeeId,
        employeeName: e.employee.fullName,
        department: e.employee.department,
        category: e.category,
        billDate: e.expenseDate,
        approvedAmount: approved,
        amountPaid: paid,
        balanceRemaining: balance,
        clearanceStatus: isCleared ? 'Paid/Cleared' : isPartial ? 'Partially Paid' : 'Payment Pending',
        latestPaymentDate: e.payments[0]?.paymentDate || null,
        latestPaymentMethod: e.payments[0]?.paymentMethod || '—',
        latestTransactionRef: e.payments[0]?.transactionRef || '—',
        paymentsCount: e.payments.length,
        payments: e.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          transactionRef: p.transactionRef,
          notes: p.notes,
          receiptNumber: p.receiptNumber,
        })),
      };
    });

    const wageItems = wages.map((w) => {
      const approved = Number(w.netPayable);
      const paid = Number(w.amountPaid);
      const balance = Number(w.balanceRemaining);
      const isCleared = w.status === 'PAID';
      const isPartial = w.status === 'PARTIALLY_PAID';

      return {
        id: w.id,
        billId: `WAG/${w.employee.employeeId}/${w.payPeriod.replace(/\s+/g, '-')}`,
        type: 'WAGE_PAYMENT',
        employeeId: w.employee.employeeId,
        employeeName: w.employee.fullName,
        department: w.employee.department,
        category: `Salary (${w.payPeriod})`,
        billDate: w.createdAt,
        approvedAmount: approved,
        amountPaid: paid,
        balanceRemaining: balance,
        clearanceStatus: isCleared ? 'Paid/Cleared' : isPartial ? 'Partially Paid' : 'Payment Pending',
        latestPaymentDate: w.payments[0]?.paymentDate || null,
        latestPaymentMethod: w.payments[0]?.paymentMethod || '—',
        latestTransactionRef: w.payments[0]?.transactionRef || '—',
        paymentsCount: w.payments.length,
        payments: w.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          transactionRef: p.transactionRef,
          notes: p.notes,
          receiptNumber: p.receiptNumber,
        })),
      };
    });

    let allItems = [...expenseItems, ...wageItems];

    if (type !== 'ALL') {
      allItems = allItems.filter((i) => i.type === type);
    }

    if (status !== 'ALL') {
      allItems = allItems.filter((i) => i.clearanceStatus === status);
    }

    if (search) {
      const q = (search as string).toLowerCase();
      allItems = allItems.filter(
        (i) =>
          i.billId.toLowerCase().includes(q) ||
          i.employeeName.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          i.employeeId.toLowerCase().includes(q)
      );
    }

    // Summary calculations
    const pendingBillsCount = allItems.filter((i) => i.clearanceStatus !== 'Paid/Cleared').length;
    const totalApproved = allItems.reduce((sum, i) => sum + i.approvedAmount, 0);
    const totalPaid = allItems.reduce((sum, i) => sum + i.amountPaid, 0);
    const outstanding = totalApproved - totalPaid;
    const partiallyPaidCount = allItems.filter((i) => i.clearanceStatus === 'Partially Paid').length;
    const fullyClearedCount = allItems.filter((i) => i.clearanceStatus === 'Paid/Cleared').length;

    return res.json({
      summary: {
        pendingBillsCount,
        totalApproved,
        totalPaid,
        outstanding,
        partiallyPaidCount,
        fullyClearedCount,
      },
      bills: allItems,
    });
  } catch (error) {
    console.error('Error in clearance bills:', error);
    return res.status(500).json({ error: 'Failed to fetch clearance bills' });
  }
}

export async function clearBillPayment(req: AuthRequest, res: Response) {
  try {
    const { billType, recordId, amount, paymentDate, paymentMethod = 'Bank Transfer', transactionRef, notes } = req.body;

    if (!billType || !recordId || !amount || Number(amount) <= 0 || !transactionRef) {
      return res.status(400).json({
        error: 'Bill type, record ID, positive payment amount, and transaction reference are required',
      });
    }

    const payAmount = Number(amount);
    const year = new Date().getFullYear();

    if (billType === 'EXPENSE_REIMBURSEMENT') {
      const claim = await prisma.expenseClaim.findUnique({
        where: { id: recordId },
        include: { employee: true },
      });

      if (!claim) {
        return res.status(404).json({ error: 'Expense claim not found' });
      }

      const remaining = Number(claim.balanceRemaining);
      if (payAmount > remaining + 0.01) {
        return res.status(400).json({
          error: `Payment amount (₹${payAmount}) exceeds outstanding balance (₹${remaining})`,
        });
      }

      const newPaid = Number(claim.amountPaid) + payAmount;
      const newRemaining = Math.max(0, Number(claim.approvedAmount) - newPaid);
      const newStatus = newRemaining <= 0.01 ? 'PAID_CLEARED' : 'PARTIALLY_REIMBURSED';

      const pCount = await prisma.expensePayment.count();
      const receiptNumber = `RCP/EXP/${year}/${String(pCount + 1).padStart(3, '0')}`;

      const [payment] = await prisma.$transaction([
        prisma.expensePayment.create({
          data: {
            expenseClaimId: recordId,
            amount: payAmount,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentMethod,
            transactionRef,
            notes,
            recordedById: req.user!.id,
            receiptNumber,
          },
        }),
        prisma.expenseClaim.update({
          where: { id: recordId },
          data: {
            amountPaid: newPaid,
            balanceRemaining: newRemaining,
            status: newStatus,
          },
        }),
      ]);

      await createAuditLog({
        userId: req.user?.id,
        userName: req.user?.name || 'User',
        userRole: req.user?.role || 'UNKNOWN',
        action: 'BILL_CLEARED',
        entityType: 'EXPENSE',
        entityId: recordId,
        details: `Reimbursement bill ${claim.claimNumber} settled for ₹${payAmount} (Status: ${newStatus}, Ref: ${transactionRef})`,
        ipAddress: req.ip,
      });

      return res.status(201).json({ payment, message: 'Expense payment cleared successfully' });
    } else if (billType === 'WAGE_PAYMENT') {
      const wage = await prisma.employeeWageRecord.findUnique({
        where: { id: recordId },
        include: { employee: true },
      });

      if (!wage) {
        return res.status(404).json({ error: 'Wage record not found' });
      }

      const remaining = Number(wage.balanceRemaining);
      if (payAmount > remaining + 0.01) {
        return res.status(400).json({
          error: `Payment amount (₹${payAmount}) exceeds outstanding salary balance (₹${remaining})`,
        });
      }

      const newPaid = Number(wage.amountPaid) + payAmount;
      const newRemaining = Math.max(0, Number(wage.netPayable) - newPaid);
      const newStatus = newRemaining <= 0.01 ? 'PAID' : 'PARTIALLY_PAID';

      const pCount = await prisma.wagePayment.count();
      const receiptNumber = `RCP/WAG/${year}/${String(pCount + 1).padStart(3, '0')}`;

      const [payment] = await prisma.$transaction([
        prisma.wagePayment.create({
          data: {
            wageRecordId: recordId,
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
          where: { id: recordId },
          data: {
            amountPaid: newPaid,
            balanceRemaining: newRemaining,
            status: newStatus,
          },
        }),
      ]);

      await createAuditLog({
        userId: req.user?.id,
        userName: req.user?.name || 'User',
        userRole: req.user?.role || 'UNKNOWN',
        action: 'WAGE_BILL_CLEARED',
        entityType: 'WAGES',
        entityId: recordId,
        details: `Salary bill for ${wage.employee.fullName} (${wage.payPeriod}) settled for ₹${payAmount} (Status: ${newStatus}, Ref: ${transactionRef})`,
        ipAddress: req.ip,
      });

      return res.status(201).json({ payment, message: 'Salary payment recorded and cleared successfully' });
    } else {
      return res.status(400).json({ error: 'Invalid bill type' });
    }
  } catch (error) {
    console.error('Error clearing bill:', error);
    return res.status(500).json({ error: 'Failed to record bill clearance' });
  }
}

