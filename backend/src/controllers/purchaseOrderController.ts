import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import { generatePurchaseOrderPDF } from '../services/pdfService.js';

/**
 * Generates a clean, monotonically increasing, collision-safe PO Number:
 * Format: PO/SF/YYYY/XXX (e.g. PO/SF/2026/001, PO/SF/2026/002)
 * Queries all existing POs for the current calendar year to find the true numeric maximum,
 * preventing any race conditions, deletions, or multiple-employee conflicts.
 */
async function generateNextPONumber(tx: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PO/SF/${currentYear}/`;

  const existingPOs = await tx.purchaseOrder.findMany({
    where: {
      poNumber: {
        startsWith: prefix,
      },
    },
    select: {
      poNumber: true,
    },
  });

  let maxSeq = 0;
  for (const po of existingPOs) {
    const parts = po.poNumber.split('/');
    const seqStr = parts[parts.length - 1];
    const seqNum = parseInt(seqStr, 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  }

  let nextSeq = maxSeq + 1;

  // Collision guard loop
  while (true) {
    const candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    const exists = await tx.purchaseOrder.findUnique({
      where: { poNumber: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextSeq++;
  }
}

/**
 * Generates a clean, monotonically increasing, collision-safe CD (Customer Due) Number:
 * Format: CD/SF/YYYY/XXX (e.g. CD/SF/2026/001, CD/SF/2026/002)
 * Used exclusively for employee retail customer due entries.
 */
async function generateNextCDNumber(tx: any): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CD/SF/${currentYear}/`;

  const existingCDs = await tx.purchaseOrder.findMany({
    where: {
      poNumber: {
        startsWith: prefix,
      },
    },
    select: {
      poNumber: true,
    },
  });

  let maxSeq = 0;
  for (const cd of existingCDs) {
    const parts = cd.poNumber.split('/');
    const seqStr = parts[parts.length - 1];
    const seqNum = parseInt(seqStr, 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  }

  let nextSeq = maxSeq + 1;

  while (true) {
    const candidate = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    const exists = await tx.purchaseOrder.findUnique({
      where: { poNumber: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextSeq++;
  }
}

export async function getPurchaseOrders(req: AuthRequest, res: Response) {
  try {
    const { search, status, financialStatus, supplierId, fromDate, toDate, type } = req.query;

    // Auto-migration: Convert any existing Employee-created POs into CDs (PO/SF/... -> CD/SF/...)
    try {
      const employeePOs = await prisma.purchaseOrder.findMany({
        where: {
          createdBy: { role: 'EMPLOYEE' },
          poNumber: { startsWith: 'PO/' },
        },
        select: { id: true, poNumber: true },
      });

      for (const ep of employeePOs) {
        const targetCD = ep.poNumber.replace(/^PO\//, 'CD/');
        const exists = await prisma.purchaseOrder.findUnique({
          where: { poNumber: targetCD },
          select: { id: true },
        });
        if (!exists) {
          await prisma.purchaseOrder.update({
            where: { id: ep.id },
            data: { poNumber: targetCD },
          });
        }
      }
    } catch (migErr) {
      console.error('Auto-migration employee PO -> CD error:', migErr);
    }

    const where: any = {};

    // Strict Role-based visibility:
    // Whichever CD an employee created, ONLY that record is visible to that employee.
    // ALL POs and CDs are visible to ADMIN and ACCOUNTANT.
    if (req.user?.role === 'EMPLOYEE') {
      where.createdById = req.user.id;
      where.poNumber = { startsWith: 'CD/' };
    } else if (req.query.myOrders === 'true' && req.user?.id) {
      where.createdById = req.user.id;
    }

    if (type === 'CD') {
      where.poNumber = { startsWith: 'CD/' };
    } else if (type === 'PO') {
      where.poNumber = { startsWith: 'PO/' };
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

    // Auto-heal: Ensure any PO with pendingAmount > 0 has status OPEN in the database
    prisma.purchaseOrder
      .updateMany({
        where: {
          status: 'CLOSED',
          pendingAmount: { gt: 0 },
        },
        data: {
          status: 'OPEN',
        },
      })
      .catch(() => {});

    const formatted = pos.map((p) => {
      const fin = p.financialRecord;
      const profitLoss = fin?.realizedProfitLoss ? Number(fin.realizedProfitLoss) : null;
      let finStatus = fin?.financialStatus || 'PENDING_COST_DATA';

      const advance = Number(p.advanceAmount || 0);
      const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - advance));
      // Strict Business Rule: If due is pending (> 0), status can NEVER be CLOSED! It must be OPEN.
      const effectiveStatus = (pending > 0 && p.status === 'CLOSED') ? 'OPEN' : p.status;

      return {
        id: p.id,
        poNumber: p.poNumber,
        supplierId: p.supplierId,
        supplierName: p.supplier.name,
        poDate: p.poDate,
        expectedDeliveryDate: p.expectedDeliveryDate,
        deliveryAddress: p.deliveryAddress,
        orderPersonPlace: (p as any).orderPersonPlace || null,
        createdById: p.createdById,
        createdByName: p.createdBy.name,
        approvedById: p.approvedById,
        approvedByName: p.approvedBy?.name || null,
        subtotal: Number(p.subtotal),
        discountTotal: Number(p.discountTotal),
        taxTotal: Number(p.taxTotal),
        grandTotal: Number(p.grandTotal),
        advanceAmount: advance,
        pendingAmount: pending,
        status: effectiveStatus,
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

    if (req.user?.role === 'EMPLOYEE' && po.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own purchase orders' });
    }

    const grand = Number(po.grandTotal);
    const advance = Number(po.advanceAmount || 0);
    const pending = Number(po.pendingAmount ?? Math.max(0, grand - advance));
    if (pending > 0 && po.status === 'CLOSED') {
      po.status = 'OPEN';
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
      orderPersonPlace,
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

    const personPlace = (
      orderPersonPlace ||
      req.body.place ||
      req.body.region ||
      req.body.area ||
      ''
    ).trim();

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

    // Concurrency-safe atomic transaction with unique constraint collision retry loop
    let newPO: any = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!newPO && attempts < maxAttempts) {
      attempts++;
      try {
        newPO = await prisma.$transaction(async (tx) => {
          const isEmployee = req.user?.role === 'EMPLOYEE';
          const isCD = isEmployee || req.body.isCD === true || req.body.type === 'CD' || req.query.type === 'CD';
          const poNumber = isCD ? await generateNextCDNumber(tx) : await generateNextPONumber(tx);

          return await tx.purchaseOrder.create({
            data: {
              poNumber,
              poDate: poDate ? new Date(poDate) : new Date(),
              expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
              supplierId: resolvedSupplierId,
              createdById: req.user!.id,
              deliveryAddress,
              orderPersonPlace: personPlace || null,
              paymentTerms,
              notes: personPlace
                ? `${notes ? notes + ' | ' : ''}Area: ${personPlace}`
                : notes,
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
        });
      } catch (err: any) {
        if (err.code === 'P2002' && attempts < maxAttempts) {
          console.warn(`Concurrent PO numbering collision caught on attempt ${attempts}. Automatically incrementing next PO number...`);
          continue;
        }
        throw err;
      }
    }

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

    if (req.user?.role === 'EMPLOYEE' && po.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own purchase orders' });
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

    if (req.user?.role === 'EMPLOYEE' && po.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own purchase orders' });
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

    if (req.user?.role === 'EMPLOYEE' && po.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own purchase orders' });
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

    // Strict Role Check: Closing a CD/PO requires ADMIN approval. Employees cannot close records directly.
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admin approval is required to close Customer Due / Purchase Order records' });
    }

    const grandTotal = Number(po.grandTotal);
    const advance = Number(po.advanceAmount || 0);
    const pending = Number(po.pendingAmount ?? Math.max(0, grandTotal - advance));

    // Strict Rule: A PO can only be CLOSED if due is ₹0
    if (pending > 0) {
      return res.status(400).json({
        error: `Cannot close PO: Due of ₹${pending.toLocaleString('en-IN')} is still pending. Status must remain Open until Due is ₹0.`,
      });
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

    if (req.user?.role === 'EMPLOYEE' && po.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own purchase orders' });
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

    if (req.user?.role === 'EMPLOYEE' && po.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only view your own purchase orders' });
    }

    generatePurchaseOrderPDF(
      {
        poNumber: po.poNumber,
        poDate: new Date(po.poDate).toLocaleDateString('en-GB'),
        expectedDeliveryDate: po.expectedDeliveryDate
          ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB')
          : null,
        supplierName: po.supplier?.name || 'Supplier Record',
        supplierAddress: po.supplier?.address || null,
        supplierContact: po.supplier?.phone || po.supplier?.email || null,
        createdByName: po.createdBy?.name || 'Authorized Staff',
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

export async function recordDuePayment(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      amount,
      paymentMode = 'BANK_TRANSFER',
      reference = '',
      notes = '',
      markClosed = false,
      newAdvanceAmount,
      newPendingAmount,
    } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, createdBy: true },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    if (req.user?.role === 'EMPLOYEE' && po.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: You can only record payments for your own orders' });
    }

    const grandTotal = Number(po.grandTotal);
    const currentAdvance = Number(po.advanceAmount || 0);
    const currentPending = Number(po.pendingAmount ?? Math.max(0, grandTotal - currentAdvance));

    let finalAdvance = currentAdvance;
    let finalPending = currentPending;
    let paymentAmount = 0;

    if (newAdvanceAmount !== undefined && newPendingAmount !== undefined) {
      finalAdvance = Number(newAdvanceAmount);
      finalPending = Math.max(0, Number(newPendingAmount));
      paymentAmount = Math.max(0, finalAdvance - currentAdvance);
    } else {
      paymentAmount = Number(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({ error: 'A valid payment amount greater than zero is required' });
      }
      finalAdvance = currentAdvance + paymentAmount;
      finalPending = Math.max(0, grandTotal - finalAdvance);
    }

    // Strict Business Rule: A CD/PO can ONLY be formally CLOSED with ADMIN approval when pending <= 0.
    // If pending > 0 or if not closed by ADMIN, status remains OPEN.
    let newStatus = po.status;
    if (finalPending <= 0 && req.user?.role === 'ADMIN') {
      newStatus = 'CLOSED';
    } else {
      newStatus = 'OPEN';
    }

    const comment = `Due Payment of ₹${paymentAmount.toLocaleString('en-IN')} received via ${paymentMode}.${reference ? ` Ref: ${reference}.` : ''} Remaining Due: ₹${finalPending.toLocaleString('en-IN')}.${notes ? ` Note: ${notes}` : ''}`;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        advanceAmount: finalAdvance,
        pendingAmount: finalPending,
        status: newStatus,
        statusHistory: {
          create: {
            status: newStatus,
            changedById: req.user!.id,
            comment,
          },
        },
      },
      include: {
        supplier: true,
        createdBy: true,
        items: true,
        financialRecord: true,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'PO_DUE_PAYMENT',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `Recorded ₹${paymentAmount.toLocaleString('en-IN')} due payment on ${po.poNumber}. Completed: ₹${finalAdvance.toLocaleString('en-IN')}, Remaining Due: ₹${finalPending.toLocaleString('en-IN')}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    console.error('Error recording due payment:', error);
    return res.status(500).json({ error: 'Failed to record due payment' });
  }
}

export async function createDuePurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const {
      poNumber: customPONumber,
      poDate,
      supplierName,
      supplierId,
      supplierContact,
      orderPersonName,
      orderPersonPlace = '',
      grandTotal,
      advanceAmount = 0,
      pendingAmount,
      fruitName = 'Assorted Fruits Consignment',
      varietyGrade = 'Grade A',
      quantity = 1,
      unit = 'LOT',
      notes = '',
    } = req.body;

    if (!supplierName?.trim() && !supplierId) {
      return res.status(400).json({ error: 'Supplier name or ID is required' });
    }

    const total = Number(grandTotal);
    if (isNaN(total) || total <= 0) {
      return res.status(400).json({ error: 'Valid total PO amount greater than zero is required' });
    }

    const advance = Number(advanceAmount) || 0;
    const pending =
      pendingAmount !== undefined && pendingAmount !== null && pendingAmount !== ''
        ? Number(pendingAmount)
        : Math.max(0, total - advance);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve Supplier
      let resolvedSupplier = null;
      if (supplierId) {
        resolvedSupplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      }
      if (!resolvedSupplier && supplierName?.trim()) {
        resolvedSupplier = await tx.supplier.findFirst({
          where: { name: { equals: supplierName.trim(), mode: 'insensitive' } },
        });
      }
      if (!resolvedSupplier) {
        const count = await tx.supplier.count();
        const code = `SUP-${String(count + 1).padStart(3, '0')}`;
        resolvedSupplier = await tx.supplier.create({
          data: {
            supplierCode: code,
            name: supplierName.trim(),
            phone: supplierContact || null,
            category: 'DOMESTIC',
            paymentTerms: 'NET_30',
          },
        });
      }

      // 2. Resolve PO / CD Number
      const isEmployee = req.user?.role === 'EMPLOYEE';
      const isCD = isEmployee || req.body.isCD === true || req.body.type === 'CD' || req.query.type === 'CD';
      let finalPONumber = customPONumber?.trim();
      if (finalPONumber) {
        const existing = await tx.purchaseOrder.findUnique({ where: { poNumber: finalPONumber } });
        if (existing) {
          throw new Error(
            `Order Number "${finalPONumber}" is already in use. Please enter a different number or leave blank to auto-generate.`
          );
        }
      } else {
        finalPONumber = isCD ? await generateNextCDNumber(tx) : await generateNextPONumber(tx);
      }

      const orderDateObj = poDate ? new Date(poDate) : new Date();
      const status = pending > 0 ? 'OPEN' : 'CLOSED';
      const numQty = Number(quantity) || 1;
      const rate = total / numQty;

      // 3. Create PO
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: finalPONumber,
          poDate: orderDateObj,
          supplierId: resolvedSupplier.id,
          createdById: req.user!.id,
          orderPersonPlace: orderPersonPlace ? String(orderPersonPlace).trim() : null,
          grandTotal: total,
          subtotal: total,
          advanceAmount: advance,
          pendingAmount: pending,
          status,
          notes: notes
            ? `${notes} (Legacy Due PO)`
            : 'Legacy Due PO recorded directly into Due Tracker',
          items: {
            create: [
              {
                fruitName: fruitName || 'Assorted Fruits Consignment',
                category: 'Fresh Fruits',
                varietyGrade: varietyGrade || 'Grade A',
                quantity: numQty,
                unit: unit || 'LOT',
                ratePerUnit: rate,
                discountPercent: 0,
                taxPercent: 0,
                lineTotal: total,
              },
            ],
          },
          statusHistory: {
            create: {
              status,
              changedById: req.user!.id,
              comment: `Legacy Due PO entered into system. Total: ₹${total.toLocaleString('en-IN')}, Cleared: ₹${advance.toLocaleString('en-IN')}, Pending Due: ₹${pending.toLocaleString('en-IN')}.${orderPersonName ? ` Handled by: ${orderPersonName}.` : ''}`,
            },
          },
          financialRecord: {
            create: {
              financialStatus: 'NOT_CALCULATED',
            },
          },
        },
        include: {
          supplier: true,
          createdBy: true,
          items: true,
          financialRecord: true,
        },
      });

      return po;
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'LEGACY_DUE_PO_CREATED',
      entityType: 'PURCHASE_ORDER',
      entityId: result.id,
      details: `Recorded legacy due purchase order ${result.poNumber} for supplier ${result.supplier.name}. Total: ₹${total.toLocaleString('en-IN')}, Due: ₹${pending.toLocaleString('en-IN')}`,
      ipAddress: req.ip,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating due purchase order:', error);
    return res.status(500).json({ error: error.message || 'Failed to create due purchase order' });
  }
}

export async function deletePurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, createdBy: true },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    // Strict Role Check: ONLY ADMIN can delete records. Employees cannot delete.
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Only Administrators have permission to delete records' });
    }

    await prisma.purchaseOrder.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'PO_DELETED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `Purchase Order ${po.poNumber} (Supplier: ${po.supplier.name}) was deleted by ${req.user?.name || 'User'}`,
      ipAddress: req.ip,
    });

    return res.json({ message: `Purchase Order ${po.poNumber} deleted successfully` });
  } catch (error: any) {
    console.error('Error deleting purchase order:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete purchase order' });
  }
}



