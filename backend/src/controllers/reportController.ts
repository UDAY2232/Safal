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
    const { format } = req.query;

    const pos = await prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        createdBy: true,
        financialRecord: true,
      },
      orderBy: { poDate: 'desc' },
    });

    if (format === 'csv') {
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
    return res.status(500).json({ error: 'Failed to generate PO report' });
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

