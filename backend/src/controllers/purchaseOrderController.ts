import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import { generatePurchaseOrderPDF } from '../services/pdfService.js';

export async function getPurchaseOrders(req: AuthRequest, res: Response) {
  try {
    const { search, status, financialStatus, supplierId, fromDate, toDate } = req.query;

    const where: any = {};

    // Role-based visibility
    if (req.user?.role === 'ACCOUNTANT') {
      // Accountants see POs created by them or permitted POs
      where.createdById = req.user.id;
    }

    if (status && status !== 'All') {
      where.status = status as any;
    }

    if (financialStatus && financialStatus !== 'All') {
      where.financialRecord = {
        financialStatus: financialStatus as any,
      };
    }

    if (supplierId && supplierId !== 'All') {
      where.supplierId = supplierId as string;
    }

    if (fromDate || toDate) {
      where.poDate = {};
      if (fromDate) where.poDate.gte = new Date(fromDate as string);
      if (toDate) where.poDate.lte = new Date(toDate as string);
    }

    if (search) {
      where.OR = [
        { poNumber: { contains: search as string, mode: 'insensitive' } },
        { supplier: { name: { contains: search as string, mode: 'insensitive' } } },
        { notes: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
        financialRecord: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = pos.map((p) => {
      const fin = p.financialRecord;
      const profitLoss = fin?.realizedProfitLoss ? Number(fin.realizedProfitLoss) : null;
      let finStatus = fin?.financialStatus || 'PENDING_COST_DATA';

      return {
        id: p.id,
        poNumber: p.poNumber,
        supplierId: p.supplierId,
        supplierName: p.supplier.name,
        poDate: p.poDate,
        expectedDeliveryDate: p.expectedDeliveryDate,
        createdById: p.createdById,
        createdByName: p.createdBy.name,
        approvedById: p.approvedById,
        approvedByName: p.approvedBy?.name || null,
        subtotal: Number(p.subtotal),
        discountTotal: Number(p.discountTotal),
        taxTotal: Number(p.taxTotal),
        grandTotal: Number(p.grandTotal),
        advanceAmount: Number(p.advanceAmount || 0),
        pendingAmount: Number(p.pendingAmount || 0),
        status: p.status,
        rejectionReason: p.rejectionReason,
        itemsCount: p.items.length,
        items: p.items.map((i) => ({
          id: i.id,
          fruitName: i.fruitName,
          category: i.category,
          varietyGrade: i.varietyGrade,
          quantity: Number(i.quantity),
          unit: i.unit,
          ratePerUnit: Number(i.ratePerUnit),
          discountPercent: Number(i.discountPercent),
          taxPercent: Number(i.taxPercent),
          lineTotal: Number(i.lineTotal),
        })),
        financial: {
          verifiedCost: fin?.verifiedCost ? Number(fin.verifiedCost) : null,
          allocatedTransportCost: fin?.allocatedTransportCost ? Number(fin.allocatedTransportCost) : 0,
          allocatedLaborCost: fin?.allocatedLaborCost ? Number(fin.allocatedLaborCost) : 0,
          linkedRevenue: fin?.linkedRevenue ? Number(fin.linkedRevenue) : null,
          realizedProfitLoss: profitLoss,
          financialStatus: finStatus,
        },
      };
    });

    return res.json(formatted);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    return res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
}

export async function getPurchaseOrderById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
        financialRecord: true,
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    // Role check: accountant can view if created by them or admin
    if (req.user?.role === 'ACCOUNTANT' && po.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this purchase order' });
    }

    return res.json(po);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch purchase order' });
  }
}

export async function createPurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const {
      supplierId,
      poDate,
      expectedDeliveryDate,
      deliveryAddress,
      paymentTerms,
      advanceAmount,
      pendingAmount,
      grandTotal: manualGrandTotal,
      totalAmount,
      notes,
      items,
      submitForApproval = false,
    } = req.body;

    if (!supplierId || !String(supplierId).trim()) {
      return res.status(400).json({ error: 'Supplier is required' });
    }

    // Resolve or auto-create supplier from manual input
    let resolvedSupplierId = String(supplierId).trim();
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        OR: [
          { id: resolvedSupplierId },
          { name: { equals: resolvedSupplierId, mode: 'insensitive' } },
        ],
      },
    });

    if (existingSupplier) {
      resolvedSupplierId = existingSupplier.id;
    } else {
      const sCount = await prisma.supplier.count();
      const createdSupplier = await prisma.supplier.create({
        data: {
          supplierCode: `SUP-${String(sCount + 1).padStart(3, '0')}`,
          name: resolvedSupplierId,
          category: 'Wholesale Fruits',
          paymentTerms: 'Custom',
          status: 'ACTIVE',
        },
      });
      resolvedSupplierId = createdSupplier.id;
    }

    // Auto-generate PO Number: PO/SF/YYYY/XXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO/SF/${currentYear}/${String(count + 1).padStart(3, '0')}`;

    // Determine target grand total
    const enteredGrandTotal =
      manualGrandTotal !== undefined && manualGrandTotal !== null && manualGrandTotal !== ''
        ? Number(manualGrandTotal)
        : totalAmount !== undefined && totalAmount !== null && totalAmount !== ''
        ? Number(totalAmount)
        : 0;

    // Calculate totals
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let processedItems: any[] = [];

    if (items && Array.isArray(items) && items.length > 0) {
      processedItems = items.map((item: any) => {
        const qty = Number(item.quantity) || 1;
        const rate = Number(item.ratePerUnit) || 0;
        const discPercent = Number(item.discountPercent) || 0;
        const taxPercent = Number(item.taxPercent) || 0;

        const rawTotal = qty * rate;
        const discount = rawTotal * (discPercent / 100);
        const afterDiscount = rawTotal - discount;
        const tax = afterDiscount * (taxPercent / 100);
        const lineTotal = afterDiscount + tax;

        subtotal += rawTotal;
        discountTotal += discount;
        taxTotal += tax;

        return {
          fruitName: item.fruitName || req.body.fruitName || 'Assorted Fruits',
          category: item.category || 'Fresh Fruits',
          varietyGrade: item.varietyGrade || 'Grade A',
          quantity: qty,
          unit: item.unit || 'KG',
          ratePerUnit: rate,
          discountPercent: discPercent,
          taxPercent: taxPercent,
          lineTotal: lineTotal > 0 ? lineTotal : enteredGrandTotal,
        };
      });
    } else {
      const fruitDesc = req.body.fruitName || req.body.itemDescription || 'Wholesale Fruit Procurement';
      processedItems = [
        {
          fruitName: fruitDesc,
          category: 'Fresh Fruits',
          varietyGrade: 'Standard Procurement',
          quantity: 1,
          unit: 'CONSIGNMENT',
          ratePerUnit: enteredGrandTotal,
          discountPercent: 0,
          taxPercent: 0,
          lineTotal: enteredGrandTotal,
        },
      ];
      subtotal = enteredGrandTotal;
    }

    const calculatedGrandTotal = subtotal - discountTotal + taxTotal;
    const grandTotal =
      manualGrandTotal !== undefined && manualGrandTotal !== null && manualGrandTotal !== ''
        ? Number(manualGrandTotal)
        : totalAmount !== undefined && totalAmount !== null && totalAmount !== ''
        ? Number(totalAmount)
        : calculatedGrandTotal;

    const advance = Number(advanceAmount) || 0;
    const pending = pendingAmount !== undefined && pendingAmount !== null && pendingAmount !== ''
      ? Number(pendingAmount)
      : Math.max(0, grandTotal - advance);
    const initialStatus = submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT';

    if (processedItems.length === 1 && processedItems[0].lineTotal === 0 && grandTotal > 0) {
      processedItems[0].lineTotal = grandTotal;
      processedItems[0].ratePerUnit = grandTotal / (processedItems[0].quantity || 1);
    }

    const effectiveSubtotal = subtotal > 0 ? subtotal : grandTotal;

    const newPO = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        poDate: poDate ? new Date(poDate) : new Date(),
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        supplierId: resolvedSupplierId,
        createdById: req.user!.id,
        deliveryAddress,
        paymentTerms,
        notes,
        subtotal: effectiveSubtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        advanceAmount: advance,
        pendingAmount: pending,
        status: initialStatus,
        items: {
          create: processedItems,
        },
        statusHistory: {
          create: {
            status: initialStatus,
            changedById: req.user!.id,
            comment: submitForApproval ? 'Created and submitted for approval' : 'Saved as draft',
          },
        },
        financialRecord: {
          create: {
            financialStatus: 'PENDING_COST_DATA',
          },
        },
      },
      include: {
        supplier: true,
        items: true,
      },
    });

    // Create Notification if submitted for approval
    if (submitForApproval) {
      await prisma.notification.create({
        data: {
          recipientRole: 'ADMIN',
          title: 'New PO Awaiting Approval',
          message: `${newPO.poNumber} from ${newPO.supplier.name} for ₹${grandTotal.toLocaleString('en-IN')} submitted by ${req.user!.name}`,
          type: 'ACTION_REQUIRED',
          linkUrl: `/purchase-orders/${newPO.id}`,
        },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: submitForApproval ? 'PO_SUBMITTED' : 'PO_DRAFT_CREATED',
      entityType: 'PURCHASE_ORDER',
      entityId: newPO.id,
      details: `${newPO.poNumber} created (${initialStatus}) for ₹${grandTotal}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(newPO);
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return res.status(500).json({ error: 'Failed to create purchase order' });
  }
}

export async function submitPurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    if (po.status !== 'DRAFT' && po.status !== 'REJECTED') {
      return res.status(400).json({ error: `Cannot submit PO in '${po.status}' status` });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        statusHistory: {
          create: {
            status: 'PENDING_APPROVAL',
            changedById: req.user!.id,
            comment: 'Submitted for Admin approval',
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        recipientRole: 'ADMIN',
        title: 'PO Submitted for Approval',
        message: `${po.poNumber} has been submitted by ${req.user!.name}`,
        type: 'ACTION_REQUIRED',
        linkUrl: `/purchase-orders/${po.id}`,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'PO_SUBMITTED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `${po.poNumber} submitted for approval`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to submit purchase order' });
  }
}

export async function approvePurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    if (po.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({ error: `Cannot approve PO in '${po.status}' status` });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'OPEN',
        approvedById: req.user!.id,
        statusHistory: {
          create: {
            status: 'OPEN',
            changedById: req.user!.id,
            comment: 'Approved by Admin - Status changed to Open',
          },
        },
      },
    });

    // Notify creator
    await prisma.notification.create({
      data: {
        userId: po.createdById,
        title: 'Purchase Order Approved',
        message: `Your Purchase Order ${po.poNumber} has been approved by Admin and is now Open.`,
        type: 'SUCCESS',
        linkUrl: `/purchase-orders/${po.id}`,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'PO_APPROVED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `${po.poNumber} approved`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to approve purchase order' });
  }
}

export async function rejectPurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason,
        statusHistory: {
          create: {
            status: 'REJECTED',
            changedById: req.user!.id,
            comment: `Rejected: ${reason}`,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: po.createdById,
        title: 'Purchase Order Rejected',
        message: `Your PO ${po.poNumber} was rejected: ${reason}`,
        type: 'WARNING',
        linkUrl: `/purchase-orders/${po.id}`,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'PO_REJECTED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `${po.poNumber} rejected: ${reason}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reject purchase order' });
  }
}

export async function closePurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'CLOSED',
        statusHistory: {
          create: {
            status: 'CLOSED',
            changedById: req.user!.id,
            comment: 'Order completed and closed',
          },
        },
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'PO_CLOSED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `${po.poNumber} closed`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to close purchase order' });
  }
}

export async function updateFinancialRecords(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      verifiedCost,
      costNotes,
      allocatedTransportCost = 0,
      allocatedLaborCost = 0,
      linkedRevenue,
      revenueNotes,
    } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { financialRecord: true },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    const cost = verifiedCost !== undefined && verifiedCost !== null ? Number(verifiedCost) : null;
    const transport = Number(allocatedTransportCost) || 0;
    const labor = Number(allocatedLaborCost) || 0;
    const rev = linkedRevenue !== undefined && linkedRevenue !== null ? Number(linkedRevenue) : null;

    let totalAssociatedCost: number | null = null;
    let realizedProfitLoss: number | null = null;
    let financialStatus: any = 'NOT_CALCULATED';

    if (cost !== null && rev !== null) {
      totalAssociatedCost = cost + transport + labor;
      realizedProfitLoss = rev - totalAssociatedCost;
      if (realizedProfitLoss > 0) {
        financialStatus = 'PROFIT';
      } else if (realizedProfitLoss < 0) {
        financialStatus = 'LOSS';
      } else {
        financialStatus = 'BREAK_EVEN';
      }
    } else if (cost !== null && rev === null) {
      financialStatus = 'PENDING_SALES_DATA';
    } else if (cost === null && rev !== null) {
      financialStatus = 'PENDING_COST_DATA';
    } else {
      financialStatus = 'NOT_CALCULATED';
    }

    const updatedRecord = await prisma.purchaseOrderFinancialRecord.upsert({
      where: { purchaseOrderId: id },
      create: {
        purchaseOrderId: id,
        verifiedCost: cost,
        costNotes,
        allocatedTransportCost: transport,
        allocatedLaborCost: labor,
        linkedRevenue: rev,
        revenueNotes,
        realizedProfitLoss,
        financialStatus,
        updatedById: req.user!.id,
      },
      update: {
        verifiedCost: cost,
        costNotes,
        allocatedTransportCost: transport,
        allocatedLaborCost: labor,
        linkedRevenue: rev,
        revenueNotes,
        realizedProfitLoss,
        financialStatus,
        updatedById: req.user!.id,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'PO_FINANCIALS_UPDATED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `${po.poNumber} financial results updated: Result=${realizedProfitLoss ?? 'Pending'}, Status=${financialStatus}`,
      ipAddress: req.ip,
    });

    return res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating PO financials:', error);
    return res.status(500).json({ error: 'Failed to update financial records' });
  }
}

export async function downloadPurchaseOrderPDF(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        createdBy: true,
        items: true,
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    generatePurchaseOrderPDF(
      {
        poNumber: po.poNumber,
        poDate: new Date(po.poDate).toLocaleDateString('en-GB'),
        expectedDeliveryDate: po.expectedDeliveryDate
          ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB')
          : null,
        supplierName: po.supplier.name,
        supplierAddress: po.supplier.address,
        supplierContact: po.supplier.phone || po.supplier.email,
        createdByName: po.createdBy.name,
        deliveryAddress: po.deliveryAddress,
        paymentTerms: po.paymentTerms,
        advanceAmount: Number(po.advanceAmount || 0),
        pendingAmount: Number(po.pendingAmount || 0),
        notes: po.notes,
        subtotal: Number(po.subtotal),
        discountTotal: Number(po.discountTotal),
        taxTotal: Number(po.taxTotal),
        grandTotal: Number(po.grandTotal),
        status: po.status,
        items: po.items.map((i) => ({
          fruitName: i.fruitName,
          category: i.category,
          varietyGrade: i.varietyGrade,
          quantity: Number(i.quantity),
          unit: i.unit,
          ratePerUnit: Number(i.ratePerUnit),
          discountPercent: Number(i.discountPercent),
          taxPercent: Number(i.taxPercent),
          lineTotal: Number(i.lineTotal),
        })),
      },
      res
    );
  } catch (error) {
    console.error('Error generating PO PDF:', error);
    return res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

