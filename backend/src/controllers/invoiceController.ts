import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

export async function getInvoices(req: AuthRequest, res: Response) {
  try {
    const { search, status, type, fromDate, toDate } = req.query;

    const where: any = {};

    if (status && status !== 'All') {
      where.status = status as any;
    }

    if (type && type !== 'All') {
      where.invoiceType = type as any;
    }

    if (fromDate || toDate) {
      where.invoiceDate = {};
      if (fromDate) where.invoiceDate.gte = new Date(fromDate as string);
      if (toDate) where.invoiceDate.lte = new Date(toDate as string);
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: 'insensitive' } },
        { partyName: { contains: search as string, mode: 'insensitive' } },
        { linkedPoNumber: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    // Summary statistics
    const allInvoices = await prisma.invoice.findMany({
      select: {
        grandTotal: true,
        amountPaid: true,
        balanceDue: true,
        status: true,
      },
    });

    const totalInvoices = allInvoices.length;
    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let overdueCount = 0;

    for (const inv of allInvoices) {
      const g = Number(inv.grandTotal || 0);
      const p = Number(inv.amountPaid || 0);
      const b = Number(inv.balanceDue || 0);
      totalBilled += g;
      totalPaid += p;
      totalPending += b;
      if (inv.status === 'OVERDUE') overdueCount++;
    }

    res.json({
      invoices,
      stats: {
        totalInvoices,
        totalBilled,
        totalPaid,
        totalPending,
        overdueCount,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch invoices' });
  }
}

export async function getInvoiceById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch invoice' });
  }
}

export async function createInvoice(req: AuthRequest, res: Response) {
  try {
    const {
      invoiceType = 'SALES',
      partyName,
      partyGst,
      partyAddress,
      partyEmail,
      partyPhone,
      invoiceDate,
      dueDate,
      linkedPoNumber,
      taxRate = 5,
      freightShipping = 0,
      paymentTerms = 'Net 15 Days',
      notes,
      items = [],
    } = req.body;

    if (!partyName) {
      return res.status(400).json({ error: 'Party/Client name is required' });
    }

    // Auto-generate invoice number (e.g. INV/SF/2026/001)
    const currentYear = new Date().getFullYear();
    const count = await prisma.invoice.count();
    const nextSeq = String(count + 1).padStart(3, '0');
    const invoiceNumber = `INV/SF/${currentYear}/${nextSeq}`;

    // Calculate line item totals
    let subtotal = 0;
    const parsedItems = items.map((item: any) => {
      const qty = Number(item.quantity || 1);
      const rate = Number(item.rate || 0);
      const lineAmount = qty * rate;
      subtotal += lineAmount;
      return {
        description: item.description || 'Fruit Consignment Item',
        hsnCode: item.hsnCode || '08081000',
        quantity: qty,
        unit: item.unit || 'BOX',
        rate: rate,
        amount: lineAmount,
      };
    });

    const parsedTaxRate = Number(taxRate || 5);
    const taxAmount = (subtotal * parsedTaxRate) / 100;
    const parsedFreight = Number(freightShipping || 0);
    const grandTotal = subtotal + taxAmount + parsedFreight;

    const invDate = invoiceDate ? new Date(invoiceDate) : new Date();
    const dDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        invoiceType: invoiceType as any,
        partyName,
        partyGst,
        partyAddress,
        partyEmail,
        partyPhone,
        invoiceDate: invDate,
        dueDate: dDate,
        linkedPoNumber,
        subtotal,
        taxRate: parsedTaxRate,
        taxAmount,
        freightShipping: parsedFreight,
        grandTotal,
        amountPaid: 0,
        balanceDue: grandTotal,
        status: 'PENDING',
        paymentTerms,
        notes,
        items: {
          create: parsedItems,
        },
      },
      include: {
        items: true,
      },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'INVOICE_CREATED',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: `Created invoice ${invoiceNumber} for ${partyName} worth ₹${grandTotal.toLocaleString('en-IN')}`,
      });
    }

    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create invoice' });
  }
}

export async function recordInvoicePayment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { amountPaid, paymentMethod = 'Bank Transfer', notes } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const currentPaid = Number(invoice.amountPaid || 0);
    const addition = Number(amountPaid || 0);
    const newPaid = currentPaid + addition;
    const grandTotal = Number(invoice.grandTotal || 0);
    const newBalance = Math.max(0, grandTotal - newPaid);

    let newStatus = invoice.status;
    if (newBalance <= 0) {
      newStatus = 'PAID';
    } else if (newPaid > 0) {
      newStatus = 'PARTIALLY_PAID';
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        amountPaid: newPaid,
        balanceDue: newBalance,
        status: newStatus,
        paymentMethod,
        notes: notes ? `${invoice.notes ? invoice.notes + ' | ' : ''}${notes}` : invoice.notes,
      },
      include: { items: true },
    });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'INVOICE_PAYMENT_RECORDED',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: `Payment of ₹${addition.toLocaleString('en-IN')} recorded for invoice ${invoice.invoiceNumber}. Balance: ₹${newBalance.toLocaleString('en-IN')}`,
      });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to record payment' });
  }
}

export async function deleteInvoice(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot delete a settled and paid invoice' });
    }

    await prisma.invoice.delete({ where: { id } });

    if (req.user) {
      await createAuditLog({
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: 'INVOICE_DELETED',
        entityType: 'INVOICE',
        entityId: invoice.id,
        details: `Deleted invoice ${invoice.invoiceNumber}`,
      });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete invoice' });
  }
}
