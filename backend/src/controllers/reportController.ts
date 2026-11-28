import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

function formatCSV(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');
  const rowLines = rows.map((r) =>
    r.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  );
  return [headerLine, ...rowLines].join('\n');
}

export async function getPOReports(req: AuthRequest, res: Response) {
  try {
    const { format, type } = req.query;

    const isCDType = type === 'CD' || req.originalUrl?.includes('customer-dues');
    const where: any = {};
    if (isCDType) {
      where.poNumber = { startsWith: 'CD/' };
    } else {
      where.poNumber = { startsWith: 'PO/' };
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        createdBy: true,
        financialRecord: true,
      },
      orderBy: { poDate: 'desc' },
    });

    if (format === 'csv') {
      if (isCDType) {
        const headers = [
          'CD Number',
          'Customer / Buyer',
          'Order Date',
          'Recorded By (Staff)',
          'Area / Place',
          'Total CD Amount (INR)',
          'Advance Paid (INR)',
          'Pending Due Balance (INR)',
          'Status',
          'Proof Attached',
          'Notes',
        ];

        const rows = pos.map((p) => {
          const adv = Number(p.advanceAmount || 0);
          const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - adv));
          const staffMatch = p.notes?.match(/Order Taken By:\s*([^|\n]+)/);
          return [
            p.poNumber,
            p.supplier.name,
            new Date(p.poDate).toLocaleDateString('en-GB'),
            staffMatch ? staffMatch[1].trim() : p.createdBy.name,
            p.orderPersonPlace || 'Warangal',
            Number(p.grandTotal),
            adv,
            pending,
            pending <= 0 && p.status === 'CLOSED' ? 'CLOSED' : p.status,
            p.paymentProofUrl ? 'YES' : 'NO',
            p.notes || '',
          ];
        });

        const csvData = formatCSV(headers, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="CustomerDues_Report.csv"');
        return res.send(csvData);
      }

      const headers = [
        'PO Number',
        'Supplier',
        'PO Date',
        'Expected Delivery',
        'Created By',
        'Subtotal (INR)',
        'Discount (INR)',
        'Tax (INR)',
        'Grand Total (INR)',
        'Status',
        'Verified Cost (INR)',
        'Linked Revenue (INR)',
        'Realized Profit/Loss (INR)',
        'Financial Status',
      ];

      const rows = pos.map((p) => [
        p.poNumber,
        p.supplier.name,
        new Date(p.poDate).toLocaleDateString('en-GB'),
        p.expectedDeliveryDate ? new Date(p.expectedDeliveryDate).toLocaleDateString('en-GB') : 'N/A',
        p.createdBy.name,
        Number(p.subtotal),
        Number(p.discountTotal),
        Number(p.taxTotal),
        Number(p.grandTotal),
        p.status,
        p.financialRecord?.verifiedCost ? Number(p.financialRecord.verifiedCost) : 'Pending',
        p.financialRecord?.linkedRevenue ? Number(p.financialRecord.linkedRevenue) : 'Pending',
        p.financialRecord?.realizedProfitLoss ? Number(p.financialRecord.realizedProfitLoss) : 'Pending',
        p.financialRecord?.financialStatus || 'PENDING_COST_DATA',
      ]);

      const csvData = formatCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="PurchaseOrders_Report.csv"');
      return res.send(csvData);
    }

    return res.json(pos);
  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({ error: 'Failed to generate report' });
  }
}

export async function getWageReports(req: AuthRequest, res: Response) {
  try {
    const { format } = req.query;

    const wages = await prisma.employeeWageRecord.findMany({
      include: { employee: true },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const headers = [
        'Employee ID',
        'Employee Name',
        'Department',
        'Designation',
        'Pay Period',
        'Wage Type',
        'Gross Amount (INR)',
        'Deductions (INR)',
        'Net Payable (INR)',
        'Amount Paid (INR)',
        'Balance Remaining (INR)',
        'Status',
      ];

      const rows = wages.map((w) => [
        w.employee.employeeId,
        w.employee.fullName,
        w.employee.department,
        w.employee.designation,
        w.payPeriod,
        w.wageType,
        Number(w.grossAmount),
        Number(w.deductions),
        Number(w.netPayable),
        Number(w.amountPaid),
        Number(w.balanceRemaining),
        w.status,
      ]);

      const csvData = formatCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="EmployeeWages_Report.csv"');
      return res.send(csvData);
    }

    return res.json(wages);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate wage report' });
  }
}

export async function getExpenseReports(req: AuthRequest, res: Response) {
  try {
    const { format } = req.query;

    const expenses = await prisma.expenseClaim.findMany({
      include: { employee: true },
      orderBy: { expenseDate: 'desc' },
    });

    if (format === 'csv') {
      const headers = [
        'Claim Number',
        'Employee ID',
        'Employee Name',
        'Department',
        'Expense Date',
        'Category',
        'Description',
        'Business Purpose',
        'Claimed (INR)',
        'Approved (INR)',
        'Reimbursed (INR)',
        'Outstanding (INR)',
        'Status',
      ];

      const rows = expenses.map((e) => [
        e.claimNumber,
        e.employee.employeeId,
        e.employee.fullName,
        e.employee.department,
        new Date(e.expenseDate).toLocaleDateString('en-GB'),
        e.category,
        e.description,
        e.businessPurpose,
        Number(e.amountSpent),
        Number(e.approvedAmount),
        Number(e.amountPaid),
        Number(e.balanceRemaining),
        e.status,
      ]);

      const csvData = formatCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ExpenseClaims_Report.csv"');
      return res.send(csvData);
    }

    return res.json(expenses);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate expense report' });
  }
}

export async function getProfitLossReport(req: AuthRequest, res: Response) {
  try {
    const { format } = req.query;

    const records = await prisma.purchaseOrderFinancialRecord.findMany({
      include: {
        purchaseOrder: {
          include: {
            supplier: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (format === 'csv') {
      const headers = [
        'PO Number',
        'Supplier',
        'PO Total (INR)',
        'Verified Goods Cost (INR)',
        'Allocated Transport (INR)',
        'Allocated Labor (INR)',
        'Total Associated Cost (INR)',
        'Recognized Sales Revenue (INR)',
        'Realized Profit/Loss (INR)',
        'Financial Status',
      ];

      const rows = records.map((r) => {
        const vCost = r.verifiedCost ? Number(r.verifiedCost) : 0;
        const trans = Number(r.allocatedTransportCost) || 0;
        const labor = Number(r.allocatedLaborCost) || 0;
        const totalCost = r.verifiedCost ? vCost + trans + labor : 'Pending';

        return [
          r.purchaseOrder.poNumber,
          r.purchaseOrder.supplier.name,
          Number(r.purchaseOrder.grandTotal),
          r.verifiedCost ? vCost : 'Pending',
          trans,
          labor,
          totalCost,
          r.linkedRevenue ? Number(r.linkedRevenue) : 'Pending',
          r.realizedProfitLoss ? Number(r.realizedProfitLoss) : 'Pending',
          r.financialStatus,
        ];
      });

      const csvData = formatCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="ProfitLoss_Financial_Report.csv"');
      return res.send(csvData);
    }

    return res.json(records);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate P&L report' });
  }
}

export async function getVendorCommissionReports(req: AuthRequest, res: Response) {
  try {
    const { format, fromDate, toDate, vendorId, status } = req.query;

    const andConditions: any[] = [
      {
        OR: [
          { creatorRole: 'VENDOR' },
          { vendorProfileId: { not: null } },
        ],
      },
    ];

    if (status && status !== 'All') {
      andConditions.push({ status: status as any });
    }
    if (vendorId) {
      andConditions.push({
        OR: [
          { vendorProfileId: vendorId as string },
          { supplierId: vendorId as string },
        ],
      });
    }
    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) dateFilter.gte = new Date(fromDate as string);
      if (toDate) dateFilter.lte = new Date(toDate as string);
      andConditions.push({ poDate: dateFilter });
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: { AND: andConditions },
      include: {
        supplier: true,
        vendorProfile: true,
        createdBy: true,
        items: true,
      },
      orderBy: { poDate: 'desc' },
    });

    if (format === 'csv') {
      const headers = [
        'S.No',
        'PO Number',
        'Vendor Name',
        'Vendor ID',
        'Area / Hub',
        'Commodity',
        'PO Amount (INR)',
        'SAFAL 5% Commission (INR)',
        'APMC 1% Mandi Cess (INR)',
        'Total Commission (INR)',
        'Net Realized Payable (INR)',
        'Advance Disbursed (INR)',
        'Balance Due (INR)',
        'PO Date',
        'Status',
      ];

      const rows = pos.map((p, idx) => {
        const grand = Number(p.grandTotal || 0);
        const safal = p.safalCommissionAmount !== null && p.safalCommissionAmount !== undefined ? Number(p.safalCommissionAmount) : Math.round(grand * 0.05);
        const apmc = p.apmcCommissionAmount !== null && p.apmcCommissionAmount !== undefined ? Number(p.apmcCommissionAmount) : Math.round(grand * 0.01);
        const totalComm = p.totalCommissionAmount !== null && p.totalCommissionAmount !== undefined ? Number(p.totalCommissionAmount) : (safal + apmc);
        const net = p.netPayableAmount !== null && p.netPayableAmount !== undefined ? Number(p.netPayableAmount) : Math.max(0, grand - totalComm);
        const adv = Number(p.advanceAmount || 0);
        const due = Number(p.pendingAmount ?? Math.max(0, net - adv));
        const commDesc = p.items && p.items.length > 0 ? p.items.map((i: any) => `${i.fruitName} (${i.quantity} ${i.unit})`).join('; ') : 'Wholesale Fruits';

        return [
          idx + 1,
          p.poNumber,
          p.supplier.name,
          p.vendorProfile?.vendorId || p.supplier.supplierCode || 'VND',
          p.orderPersonPlace || 'Warangal Hub',
          commDesc,
          grand,
          safal,
          apmc,
          totalComm,
          net,
          adv,
          due,
          new Date(p.poDate).toLocaleDateString('en-GB'),
          p.status,
        ];
      });

      const csvData = formatCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="VendorCommission_Report.csv"');
      return res.send(csvData);
    }

    return res.json(pos);
  } catch (error) {
    console.error('Error generating vendor commission report:', error);
    return res.status(500).json({ error: 'Failed to generate vendor commission report' });
  }
}

export async function getAdminPOReports(req: AuthRequest, res: Response) {
  try {
    const { format, fromDate, toDate, status } = req.query;

    const andConditions: any[] = [
      { creatorRole: { in: ['ADMIN', 'ACCOUNTANT'] } },
      { vendorProfileId: null },
      { poNumber: { startsWith: 'PO/' } },
    ];

    if (status && status !== 'All') {
      andConditions.push({ status: status as any });
    }
    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) dateFilter.gte = new Date(fromDate as string);
      if (toDate) dateFilter.lte = new Date(toDate as string);
      andConditions.push({ poDate: dateFilter });
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: { AND: andConditions },
      include: {
        supplier: true,
        createdBy: true,
        items: true,
      },
      orderBy: { poDate: 'desc' },
    });

    if (format === 'csv') {
      const headers = [
        'S.No',
        'PO Number',
        'Supplier Name',
        'Area',
        'Commodity',
        'PO Amount (INR)',
        'SAFAL Commission (INR)',
        'APMC Commission (INR)',
        'Net Amount (INR)',
        'Created By',
        'PO Date',
        'Status',
      ];

      const rows = pos.map((p, idx) => {
        const grand = Number(p.grandTotal || 0);
        const commDesc = p.items && p.items.length > 0 ? p.items.map((i: any) => `${i.fruitName} (${i.quantity} ${i.unit})`).join('; ') : 'Direct Procurement';

        return [
          idx + 1,
          p.poNumber,
          p.supplier.name,
          p.orderPersonPlace || 'Warangal',
          commDesc,
          grand,
          0,
          0,
          grand,
          p.createdBy.name,
          new Date(p.poDate).toLocaleDateString('en-GB'),
          p.status,
        ];
      });

      const csvData = formatCSV(headers, rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="AdminPO_Report.csv"');
      return res.send(csvData);
    }

    return res.json(pos);
  } catch (error) {
    console.error('Error generating admin PO report:', error);
    return res.status(500).json({ error: 'Failed to generate admin PO report' });
  }
}

