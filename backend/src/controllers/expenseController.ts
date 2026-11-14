import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

export async function getExpenses(req: AuthRequest, res: Response) {
  try {
    const { status, category, employeeId, search } = req.query;

    const where: any = {};

    // Role-based visibility
    if (req.user?.role === 'EMPLOYEE') {
      if (!req.user.employee) {
        return res.status(403).json({ error: 'No employee record linked to this user' });
      }
      where.employeeId = req.user.employee.id;
    } else if (employeeId && employeeId !== 'All') {
      where.employeeId = employeeId as string;
    }

    if (status && status !== 'All') {
      where.status = status as any;
    }

    if (category && category !== 'All') {
      where.category = category as string;
    }

    if (search) {
      where.OR = [
        { claimNumber: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { businessPurpose: { contains: search as string, mode: 'insensitive' } },
        { employee: { fullName: { contains: search as string, mode: 'insensitive' } } },
      ];
    }

    const [claims, allClaims] = await Promise.all([
      prisma.expenseClaim.findMany({
        where,
        include: {
          employee: true,
          payments: {
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.expenseClaim.findMany(),
    ]);

    // Financial calculations
    const totalClaims = allClaims.length;
    const totalSubmitted = allClaims.reduce((sum, c) => sum + Number(c.amountSpent), 0);
    const pendingReview = allClaims.filter((c) => ['SUBMITTED', 'UNDER_REVIEW'].includes(c.status)).length;
    const approvedExpenses = allClaims.reduce((sum, c) => sum + Number(c.approvedAmount), 0);
    const totalReimbursed = allClaims.reduce((sum, c) => sum + Number(c.amountPaid), 0);
    const outstandingBalance = approvedExpenses - totalReimbursed;

    const formatted = claims.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      employeeId: c.employee.employeeId,
      employeeName: c.employee.fullName,
      department: c.employee.department,
      expenseDate: c.expenseDate,
      category: c.category,
      description: c.description,
      businessPurpose: c.businessPurpose,
      travelFrom: c.travelFrom,
      travelTo: c.travelTo,
      amountSpent: Number(c.amountSpent),
      approvedAmount: Number(c.approvedAmount),
      amountPaid: Number(c.amountPaid),
      balanceRemaining: Number(c.balanceRemaining),
      paymentMethodUsed: c.paymentMethodUsed,
      receiptUrl: c.receiptUrl,
      status: c.status,
      rejectionReason: c.rejectionReason,
      reviewedById: c.reviewedById,
      reviewedAt: c.reviewedAt,
      approvedById: c.approvedById,
      approvedAt: c.approvedAt,
      paymentsCount: c.payments.length,
      payments: c.payments.map((p) => ({
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
        totalClaims,
        totalSubmitted,
        pendingReview,
        approvedExpenses,
        totalReimbursed,
        outstandingBalance,
      },
      expenses: formatted,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return res.status(500).json({ error: 'Failed to fetch expenses' });
  }
}

export async function getExpenseById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const claim = await prisma.expenseClaim.findUnique({
      where: { id },
      include: {
        employee: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Expense claim not found' });
    }

    if (req.user?.role === 'EMPLOYEE' && claim.employee.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this claim' });
    }

    return res.json(claim);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch claim' });
  }
}

export async function submitExpense(req: AuthRequest, res: Response) {
  try {
    const {
      employeeId,
      expenseDate,
      category,
      description,
      businessPurpose,
      travelFrom,
      travelTo,
      amountSpent,
      paymentMethodUsed,
      receiptUrl,
      status = 'SUBMITTED',
    } = req.body;

    let targetEmployeeId = employeeId;

    // If submitted by employee role, force targetEmployeeId to their own linked employee
    if (req.user?.role === 'EMPLOYEE') {
      if (!req.user.employee) {
        return res.status(400).json({ error: 'No employee record linked to your account' });
      }
      targetEmployeeId = req.user.employee.id;
    }

    if (!targetEmployeeId || !expenseDate || !category || !amountSpent || !businessPurpose) {
      return res.status(400).json({
        error: 'Employee, expense date, category, business purpose, and amount spent are required',
      });
    }

    // Auto-generate claim number: EXP/SF/YYYY/XXX
    const year = new Date().getFullYear();
    const count = await prisma.expenseClaim.count();
    const claimNumber = `EXP/SF/${year}/${String(count + 1).padStart(3, '0')}`;

    const parsedAmount = Number(amountSpent);
    const initialStatus = status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED';

    const claim = await prisma.expenseClaim.create({
      data: {
        claimNumber,
        employeeId: targetEmployeeId,
        expenseDate: new Date(expenseDate),
        category,
        description: description || category,
        businessPurpose,
        travelFrom: travelFrom || null,
        travelTo: travelTo || null,
        amountSpent: parsedAmount,
        approvedAmount: 0,
        amountPaid: 0,
        balanceRemaining: 0,
        paymentMethodUsed: paymentMethodUsed || 'Self',
        receiptUrl: req.file ? `/uploads/${req.file.filename}` : receiptUrl || null,
        status: initialStatus,
      },
      include: { employee: true },
    });

    if (initialStatus === 'SUBMITTED') {
      await prisma.notification.create({
        data: {
          recipientRole: 'ADMIN',
          title: 'New Expense Claim Submitted',
          message: `${claim.claimNumber} (₹${parsedAmount.toLocaleString('en-IN')}) submitted by ${claim.employee.fullName}`,
          type: 'ACTION_REQUIRED',
          linkUrl: `/expenses/${claim.id}`,
        },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: initialStatus === 'DRAFT' ? 'EXPENSE_DRAFT_CREATED' : 'EXPENSE_SUBMITTED',
      entityType: 'EXPENSE',
      entityId: claim.id,
      details: `${claim.claimNumber} submitted for ₹${parsedAmount} by ${claim.employee.fullName}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(claim);
  } catch (error) {
    console.error('Error submitting expense:', error);
    return res.status(500).json({ error: 'Failed to submit expense claim' });
  }
}

export async function reviewExpense(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const claim = await prisma.expenseClaim.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Employees cannot review
    if (req.user?.role === 'EMPLOYEE') {
      return res.status(403).json({ error: 'Employees cannot review expense claims' });
    }

    // Self-review prevention
    if (claim.employee.userId === req.user?.id) {
      return res.status(403).json({ error: 'Cannot review your own expense claim' });
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'UNDER_REVIEW',
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'EXPENSE_REVIEWED',
      entityType: 'EXPENSE',
      entityId: id,
      details: `${claim.claimNumber} marked as under review: ${notes || 'Verified receipts'}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to review claim' });
  }
}

export async function approveExpense(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { approvedAmount, reason } = req.body;

    const claim = await prisma.expenseClaim.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Prevention of self-approval
    if (claim.employee.userId === req.user?.id) {
      return res.status(403).json({ error: 'Compliance Violation: You cannot approve your own expense claim' });
    }

    const finalApproved = approvedAmount !== undefined ? Number(approvedAmount) : Number(claim.amountSpent);

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'PAYMENT_PENDING',
        approvedAmount: finalApproved,
        balanceRemaining: finalApproved,
        approvedById: req.user!.id,
        approvedAt: new Date(),
      },
    });

    // Notify employee
    if (claim.employee.userId) {
      await prisma.notification.create({
        data: {
          userId: claim.employee.userId,
          title: 'Expense Claim Approved',
          message: `Your claim ${claim.claimNumber} has been approved for ₹${finalApproved.toLocaleString('en-IN')}. Payment is pending.`,
          type: 'SUCCESS',
          linkUrl: `/expenses/${claim.id}`,
        },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'EXPENSE_APPROVED',
      entityType: 'EXPENSE',
      entityId: id,
      details: `${claim.claimNumber} approved for ₹${finalApproved} (Requested: ₹${claim.amountSpent})${reason ? ` Note: ${reason}` : ''}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error approving expense:', error);
    return res.status(500).json({ error: 'Failed to approve expense' });
  }
}

export async function rejectExpense(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const claim = await prisma.expenseClaim.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
      },
    });

    if (claim.employee.userId) {
      await prisma.notification.create({
        data: {
          userId: claim.employee.userId,
          title: 'Expense Claim Rejected',
          message: `Your claim ${claim.claimNumber} was rejected: ${reason}`,
          type: 'WARNING',
          linkUrl: `/expenses/${claim.id}`,
        },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'EXPENSE_REJECTED',
      entityType: 'EXPENSE',
      entityId: id,
      details: `${claim.claimNumber} rejected. Reason: ${reason}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reject expense' });
  }
}

export async function recordExpensePayment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { amount, paymentDate, paymentMethod = 'Bank Transfer', transactionRef, notes } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid reimbursement payment amount is required' });
    }

    if (!transactionRef) {
      return res.status(400).json({ error: 'Verifiable transaction reference number is required' });
    }

    const claim = await prisma.expenseClaim.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!claim) {
      return res.status(404).json({ error: 'Expense claim not found' });
    }

    if (!['APPROVED', 'PAYMENT_PENDING', 'PARTIALLY_REIMBURSED'].includes(claim.status)) {
      return res.status(400).json({ error: `Cannot record payment for claim in '${claim.status}' status` });
    }

    const payAmount = Number(amount);
    const approved = Number(claim.approvedAmount);
    const currentPaid = Number(claim.amountPaid);
    const remaining = Number(claim.balanceRemaining);

    if (payAmount > remaining + 0.01) {
      return res.status(400).json({
        error: `Payment amount (₹${payAmount}) exceeds remaining balance (₹${remaining})`,
      });
    }

    const newAmountPaid = currentPaid + payAmount;
    const newRemaining = Math.max(0, approved - newAmountPaid);
    const newStatus = newRemaining <= 0.01 ? 'PAID_CLEARED' : 'PARTIALLY_REIMBURSED';

    const year = new Date().getFullYear();
    const count = await prisma.expensePayment.count();
    const receiptNumber = `RCP/EXP/${year}/${String(count + 1).padStart(3, '0')}`;

    const [payment, updatedClaim] = await prisma.$transaction([
      prisma.expensePayment.create({
        data: {
          expenseClaimId: id,
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
        where: { id },
        data: {
          amountPaid: newAmountPaid,
          balanceRemaining: newRemaining,
          status: newStatus,
        },
      }),
    ]);

    if (claim.employee.userId) {
      await prisma.notification.create({
        data: {
          userId: claim.employee.userId,
          title: newStatus === 'PAID_CLEARED' ? 'Expense Reimbursement Cleared' : 'Partial Reimbursement Recorded',
          message: `Payment of ₹${payAmount.toLocaleString('en-IN')} recorded for ${claim.claimNumber} (Ref: ${transactionRef})`,
          type: 'SUCCESS',
          linkUrl: `/expenses/${claim.id}`,
        },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'EXPENSE_PAYMENT_RECORDED',
      entityType: 'EXPENSE',
      entityId: payment.id,
      details: `Reimbursed ₹${payAmount} for claim ${claim.claimNumber} to ${claim.employee.fullName} (Status: ${newStatus}, Ref: ${transactionRef})`,
      ipAddress: req.ip,
    });

    return res.status(201).json({ payment, updatedClaim });
  } catch (error) {
    console.error('Error recording expense payment:', error);
    return res.status(500).json({ error: 'Failed to record expense payment' });
  }
}

