import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import { generatePurchaseOrderPDF } from '../services/pdfService.js';
import { clearDashboardCache } from './adminController.js';
import { enrichPOWithSettlementDetails } from '../utils/settlementHelper.js';

/**
 * Generates a clean, monotonically increasing, collision-safe PO Number:
 * Format: PO/SF/YYYY/XXX (e.g. PO/SF/2026/001, PO/SF/2026/002)
 * Queries all existing POs for the current calendar year to find the true numeric maximum,
 * preventing any race conditions, deletions, or multiple-employee conflicts.
 */
export async function generateNextPONumber(tx: any): Promise<string> {
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

    const andConditions: any[] = [];

    // Strict Role-based visibility:
    // Whichever CD an employee created, ONLY that record is visible to that employee.
    // ALL POs and CDs are visible to ADMIN and ACCOUNTANT.
    // Vendors see only their own supply orders (matched via vendorProfileId, supplierCode, or createdById).
    if (req.user?.role === 'EMPLOYEE') {
      andConditions.push({ createdById: req.user.id });
      andConditions.push({ poNumber: { startsWith: 'CD/' } });
    } else if (req.user?.role === 'VENDOR') {
      const vProf = await prisma.vendorProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (vProf) {
        andConditions.push({
          OR: [
            { vendorProfileId: vProf.id },
            { supplier: { supplierCode: vProf.vendorId } },
            { supplier: { name: { contains: vProf.businessName, mode: 'insensitive' } } },
            { createdById: req.user.id },
          ],
        });
      } else {
        andConditions.push({ createdById: req.user.id });
      }
    } else if (req.query.myOrders === 'true' && req.user?.id) {
      andConditions.push({ createdById: req.user.id });
    }

    if (type === 'CD') {
      andConditions.push({ poNumber: { startsWith: 'CD/' } });
    } else if (type === 'PO') {
      andConditions.push({ poNumber: { startsWith: 'PO/' } });
    }

    if (status && status !== 'All') {
      andConditions.push({ status: status as any });
    }

    if (financialStatus && financialStatus !== 'All') {
      andConditions.push({
        financialRecord: {
          financialStatus: financialStatus as any,
        },
      });
    }

    if (supplierId && supplierId !== 'All') {
      andConditions.push({ supplierId: supplierId as string });
    }

    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) dateFilter.gte = new Date(fromDate as string);
      if (toDate) dateFilter.lte = new Date(toDate as string);
      andConditions.push({ poDate: dateFilter });
    }

    if (search) {
      andConditions.push({
        OR: [
          { poNumber: { contains: search as string, mode: 'insensitive' } },
          { supplier: { name: { contains: search as string, mode: 'insensitive' } } },
          { notes: { contains: search as string, mode: 'insensitive' } },
        ],
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

    const pos = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: true,
        vendorProfile: true,
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

    // Auto-heal: Ensure any PO with rejectionReason has status REJECTED in the database
    prisma.purchaseOrder
      .updateMany({
        where: {
          rejectionReason: { not: null },
          status: { not: 'REJECTED' },
        },
        data: {
          status: 'REJECTED',
        },
      })
      .catch(() => {});

    // Auto-heal: Ensure any PO with pendingAmount > 0 has status OPEN in the database (unless rejected)
    prisma.purchaseOrder
      .updateMany({
        where: {
          status: 'CLOSED',
          pendingAmount: { gt: 0 },
          rejectionReason: null,
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

      const isRejected = p.status === 'REJECTED' || Boolean(p.rejectionReason && String(p.rejectionReason).trim() !== '');
      const advance = Number(p.advanceAmount || 0);
      const pending = Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal) - advance));
      // Strict Business Rule: If rejected, status is ALWAYS REJECTED. If due is pending (> 0), status can NEVER be CLOSED! It must be OPEN.
      const effectiveStatus = isRejected ? 'REJECTED' : (pending > 0 && p.status === 'CLOSED') ? 'OPEN' : p.status;

      return {
        id: p.id,
        poNumber: p.poNumber,
        supplierId: p.supplierId,
        supplierName: p.supplier.name,
        poDate: p.poDate,
        expectedDeliveryDate: p.expectedDeliveryDate,
        deliveryAddress: p.deliveryAddress,
        orderPersonPlace: (p as any).orderPersonPlace || null,
        paymentProofUrl: (p as any).paymentProofUrl || null,
        paymentProofNotes: (p as any).paymentProofNotes || null,
        createdById: p.createdById,
        createdByName: (() => {
          const match = p.notes?.match(/Order Taken By:\s*([^|\n]+)/);
          return match ? match[1].trim() : p.createdBy.name;
        })(),
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

    return res.json(formatted.map(enrichPOWithSettlementDetails));
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
        vendorProfile: true,
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

    const isRejected = po.status === 'REJECTED' || Boolean(po.rejectionReason && String(po.rejectionReason).trim() !== '');
    const grand = Number(po.grandTotal);
    const advance = Number(po.advanceAmount || 0);
    const pending = Number(po.pendingAmount ?? Math.max(0, grand - advance));
    if (isRejected) {
      po.status = 'REJECTED';
    } else if (pending > 0 && po.status === 'CLOSED') {
      po.status = 'OPEN';
    }

    const staffMatch = po.notes?.match(/Order Taken By:\s*([^|\n]+)/);
    const formatted = {
      ...po,
      supplierName: po.supplier?.name || 'Party / Supplier',
      supplierCategory: po.supplier?.category || (po.poNumber?.startsWith('CD/') ? 'Customer Due' : 'Wholesale Fruits'),
      createdByName: staffMatch ? staffMatch[1].trim() : (po.createdBy?.name || 'Staff'),
      financial: {
        financialStatus: po.financialRecord?.financialStatus || 'NOT_RECORDED',
        realizedProfitLoss: po.financialRecord?.realizedProfitLoss !== undefined && po.financialRecord?.realizedProfitLoss !== null
          ? Number(po.financialRecord.realizedProfitLoss)
          : null,
        verifiedCost: po.financialRecord?.verifiedCost !== undefined && po.financialRecord?.verifiedCost !== null
          ? Number(po.financialRecord.verifiedCost)
          : null,
        allocatedTransportCost: Number(po.financialRecord?.allocatedTransportCost || 0),
        allocatedLaborCost: Number(po.financialRecord?.allocatedLaborCost || 0),
        linkedRevenue: po.financialRecord?.linkedRevenue !== undefined && po.financialRecord?.linkedRevenue !== null
          ? Number(po.financialRecord.linkedRevenue)
          : null,
      },
    };

    return res.json(enrichPOWithSettlementDetails(formatted));
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

    const contactPhone = req.body.customerPhone || req.body.phone || req.body.supplierContact || null;

    if (existingSupplier) {
      resolvedSupplierId = existingSupplier.id;
      if (contactPhone && !existingSupplier.phone) {
        await prisma.supplier.update({
          where: { id: existingSupplier.id },
          data: { phone: contactPhone },
        });
      }
    } else {
      const sCount = await prisma.supplier.count();
      const createdSupplier = await prisma.supplier.create({
        data: {
          supplierCode: `SUP-${String(sCount + 1).padStart(3, '0')}`,
          name: resolvedSupplierId,
          phone: contactPhone,
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

    // Handle items if provided as JSON string from multipart FormData
    let parsedItems = items;
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items);
      } catch (err) {
        parsedItems = [];
      }
    }

    // Calculate totals
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let processedItems: any[] = [];

    if (parsedItems && Array.isArray(parsedItems) && parsedItems.length > 0) {
      processedItems = parsedItems.map((item: any) => {
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
    const isVendorUser = req.user?.role === 'VENDOR';
    const isEmployee = req.user?.role === 'EMPLOYEE';
    const isCD =
      isEmployee ||
      req.body.isCD === true ||
      req.body.isCD === 'true' ||
      req.body.type === 'CD' ||
      req.query.type === 'CD';

    const shouldSubmit =
      submitForApproval === true ||
      submitForApproval === 'true' ||
      String(submitForApproval).toLowerCase() === 'true';
    const initialStatus = isVendorUser ? 'PENDING_APPROVAL' : shouldSubmit ? 'PENDING_APPROVAL' : 'DRAFT';

    // Extract upfront payment proof if provided
    const paymentProofUrl = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.paymentProofUrl
      ? String(req.body.paymentProofUrl).trim()
      : null;

    const paymentProofNotes = req.body.paymentProofNotes
      ? String(req.body.paymentProofNotes).trim()
      : paymentProofUrl
      ? `${req.body.paymentMode || 'Payment'} proof attached at CD creation`
      : null;

    // Strict Enforcement: Payment proof image is strictly mandatory for Customer Due creation
    if (isCD && !paymentProofUrl && (isEmployee || advance > 0)) {
      return res.status(400).json({
        error: `Payment proof image (PhonePe screenshot, Cash bill receipt, or Bank slip) is mandatory for Customer Due creation.`,
      });
    }

    // Resolve vendorProfileId if supplier is a registered Vendor (supplierCode starts with VND-) or user is VENDOR
    let linkedVendorProfileId: string | null = req.body.vendorProfileId || null;
    if (isVendorUser) {
      const vProf = await prisma.vendorProfile.findUnique({
        where: { userId: req.user!.id },
      });
      if (vProf) {
        linkedVendorProfileId = vProf.id;
        const sup = await prisma.supplier.findFirst({
          where: { supplierCode: vProf.vendorId },
        });
        if (sup) {
          resolvedSupplierId = sup.id;
        }
      }
    } else if (!linkedVendorProfileId && resolvedSupplierId) {
      const sup = await prisma.supplier.findUnique({
        where: { id: resolvedSupplierId },
        select: { supplierCode: true },
      });
      if (sup?.supplierCode && sup.supplierCode.startsWith('VND-')) {
        const vProf = await prisma.vendorProfile.findUnique({
          where: { vendorId: sup.supplierCode },
          select: { id: true },
        });
        if (vProf) {
          linkedVendorProfileId = vProf.id;
        }
      }
    }

    const isVendorProcurement = Boolean(linkedVendorProfileId) || req.body.isVendor === true || isVendorUser;
    let autoAdvanceCalculated: number | null = null;
    let finalAdvance = advance;
    let finalPending = pending;

    // 70% automatic advance calculation for vendor procurement POs
    if (isVendorProcurement && grandTotal > 0) {
      autoAdvanceCalculated = Math.round(grandTotal * 0.70);
      finalAdvance = autoAdvanceCalculated;
      finalPending = Math.max(0, grandTotal - finalAdvance);
    }

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
              vendorProfileId: linkedVendorProfileId,
              autoAdvanceCalculated,
              createdById: req.user!.id,
              deliveryAddress,
              orderPersonPlace: personPlace || null,
              paymentTerms,
              notes: [
                req.body.orderPersonName ? `Order Taken By: ${String(req.body.orderPersonName).trim()}` : '',
                personPlace ? `Area: ${personPlace}` : '',
                notes ? String(notes).trim() : '',
              ].filter(Boolean).join(' | ') || null,
              subtotal: effectiveSubtotal,
              discountTotal,
              taxTotal,
              grandTotal,
              advanceAmount: finalAdvance,
              pendingAmount: finalPending,
              paymentProofUrl: paymentProofUrl || null,
              paymentProofNotes: paymentProofNotes || null,
              status: initialStatus,
              items: {
                create: processedItems,
              },
              statusHistory: {
                create: {
                  status: initialStatus,
                  changedById: req.user!.id,
                  comment: shouldSubmit
                    ? `Created and submitted for approval${paymentProofUrl ? ' [Upfront Payment Proof Attached]' : ''}`
                    : 'Saved as draft',
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
              vendorProfile: true,
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

    // Create Notification if submitted for approval or created by Vendor
    if (shouldSubmit || isVendorUser) {
      const isCD = newPO.poNumber.startsWith('CD/');
      await prisma.notification.create({
        data: {
          recipientRole: 'ADMIN',
          title: isVendorUser
            ? 'New Vendor Supply PO Created'
            : isCD
            ? `New CD Awaiting Approval: ${newPO.poNumber}`
            : `New PO Awaiting Approval: ${newPO.poNumber}`,
          message: `${newPO.poNumber} from ${newPO.supplier.name} for ₹${grandTotal.toLocaleString('en-IN')} submitted by ${req.user!.name}${newPO.paymentProofUrl ? ' (Payment proof attached for verification)' : ''}`,
          type: 'ACTION_REQUIRED',
          linkUrl: `/purchase-orders/${newPO.id}?type=${isCD ? 'CD' : 'PO'}${newPO.paymentProofUrl ? '&proof=true' : ''}`,
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
        rejectionReason: null,
        statusHistory: {
          create: {
            status: 'PENDING_APPROVAL',
            changedById: req.user!.id,
            comment: 'Submitted for Admin approval',
          },
        },
      },
    });

    const isCD = po.poNumber.startsWith('CD/');
    await prisma.notification.create({
      data: {
        recipientRole: 'ADMIN',
        title: isCD ? `CD Submitted for Approval: ${po.poNumber}` : `PO Submitted for Approval: ${po.poNumber}`,
        message: `${po.poNumber} has been submitted by ${req.user!.name}`,
        type: 'ACTION_REQUIRED',
        linkUrl: `/purchase-orders/${po.id}?type=${isCD ? 'CD' : 'PO'}`,
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

    clearDashboardCache();
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

    clearDashboardCache();
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

    // Resolve vendor recipient
    let vendorUserId = po.createdById;
    if (po.vendorProfileId) {
      const vProfile = await prisma.vendorProfile.findUnique({
        where: { id: po.vendorProfileId },
        select: { userId: true },
      });
      if (vProfile?.userId) {
        vendorUserId = vProfile.userId;
      }
    }

    const notifyUserIds = Array.from(new Set([po.createdById, vendorUserId].filter(Boolean)));
    for (const targetId of notifyUserIds) {
      await prisma.notification.create({
        data: {
          userId: targetId,
          title: 'Safal Rejected Your Order',
          message: `Safal rejected your order ${po.poNumber}. Reason: ${reason}`,
          type: 'WARNING',
          linkUrl: `/purchase-orders/${po.id}`,
        },
      });
    }

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

    clearDashboardCache();
    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reject purchase order' });
  }
}

export async function closePurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        financialRecord: true,
        vendorProfile: {
          include: {
            user: true,
          },
        },
      },
    });

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

    // Strict Rule: For Customer Due (CD/...) records, it can only be CLOSED if due is ₹0
    if (po.poNumber.startsWith('CD/') && pending > 0) {
      return res.status(400).json({
        error: `Cannot close Customer Due: Due of ₹${pending.toLocaleString('en-IN')} is still pending. Status must remain Open until Due is ₹0.`,
      });
    }

    // Strict Rule: For Customer Due records, payment proof image must be attached before final approval & closure
    if (po.poNumber.startsWith('CD/') && !po.paymentProofUrl) {
      return res.status(400).json({
        error: `Cannot approve/close Customer Due ${po.poNumber}: Payment proof image must be uploaded and verified before Admin approval.`,
      });
    }

    // Strict Rule: For Vendor Consignment POs (PO/SF/...), commercial PO can ONLY be marked 'CLOSED' via Settle & Clear!
    // Arrival verification at Hub updates dispatchStatus to 'DELIVERED_AT_HUB' while keeping financial status 'OPEN'.
    const isVendorPO = po.poNumber.startsWith('PO/SF/') || Boolean(po.vendorProfileId);
    let isVendorSettled = false;
    if (isVendorPO && po.financialRecord?.revenueNotes) {
      try {
        const rev = JSON.parse(po.financialRecord.revenueNotes);
        if (rev.settlementCompleted && Number(rev.finalBalanceDue ?? 0) === 0 && Number(rev.finalBalancePaid ?? 0) > 0) {
          isVendorSettled = true;
        }
      } catch {}
    }

    const finalStatus = isVendorPO && !isVendorSettled ? 'OPEN' : 'CLOSED';
    const auditComment = isVendorPO && !isVendorSettled
      ? 'Consignment delivery & vehicle evidence verified at Hub. Record remains OPEN awaiting final commercial balance settlement.'
      : (po.poNumber.startsWith('CD/')
        ? 'Customer Due verified and settled'
        : 'Consignment delivery, vehicle evidence, and weighbridge slip verified and cleared by Admin');

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: finalStatus,
        dispatchStatus: 'DELIVERED_AT_HUB',
        statusHistory: {
          create: {
            status: finalStatus,
            changedById: req.user!.id,
            comment: auditComment,
          },
        },
      },
    });

    // Notify Vendor if this is a vendor consignment PO
    if (po.vendorProfile?.user?.id) {
      if (finalStatus === 'CLOSED') {
        await prisma.notification.create({
          data: {
            userId: po.vendorProfile.user.id,
            recipientRole: 'VENDOR',
            title: `Consignment Cleared: ${po.poNumber}`,
            message: `Consignment PO ${po.poNumber} has been verified and cleared by Admin. Status in your dashboard is now Cleared ✓.`,
            type: 'SUCCESS',
            linkUrl: `/dashboard`,
          },
        });
      } else {
        await prisma.notification.create({
          data: {
            userId: po.vendorProfile.user.id,
            recipientRole: 'VENDOR',
            title: `📍 Vehicle Reached Location · Ready for Sell`,
            message: `Consignment PO ${po.poNumber} (Truck ${po.dispatchVehicleNumber || 'Carrier'}) has arrived at destination hub ${po.orderPersonPlace || 'Warangal Hub'}. Consignment is verified and Ready for Mandi Sale / Auction!`,
            type: 'INFO',
            linkUrl: `/dashboard`,
          },
        });
      }
    }

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

    clearDashboardCache();
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

    let finalRevenueNotes = revenueNotes;
    if (po.financialRecord?.revenueNotes && po.financialRecord.revenueNotes.startsWith('{')) {
      try {
        const parsed = JSON.parse(po.financialRecord.revenueNotes);
        parsed.pnlNotes = revenueNotes || parsed.pnlNotes;
        parsed.mandiRealizationRevenue = rev;
        parsed.realizedProfitLoss = realizedProfitLoss;
        parsed.financialStatus = financialStatus;
        finalRevenueNotes = JSON.stringify(parsed);
      } catch {}
    }

    const updatedRecord = await prisma.purchaseOrderFinancialRecord.upsert({
      where: { purchaseOrderId: id },
      create: {
        purchaseOrderId: id,
        verifiedCost: cost,
        costNotes: costNotes || null,
        allocatedTransportCost: transport,
        allocatedLaborCost: labor,
        linkedRevenue: rev,
        revenueNotes: finalRevenueNotes,
        realizedProfitLoss,
        financialStatus,
        updatedById: req.user!.id,
      },
      update: {
        verifiedCost: cost,
        ...(costNotes !== undefined ? { costNotes } : {}),
        allocatedTransportCost: transport,
        allocatedLaborCost: labor,
        linkedRevenue: rev,
        revenueNotes: finalRevenueNotes || po.financialRecord?.revenueNotes,
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

    const adv = Number(po.advanceAmount || 0);
    const pending = Number(po.pendingAmount ?? Math.max(0, Number(po.grandTotal) - adv));
    const effectiveStatus = (pending > 0 && po.status === 'CLOSED') ? 'OPEN' : po.status;

    generatePurchaseOrderPDF(
      {
        poNumber: po.poNumber,
        poDate: new Date(po.poDate).toLocaleDateString('en-GB'),
        expectedDeliveryDate: po.expectedDeliveryDate
          ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-GB')
          : null,
        supplierName: po.supplier?.name || (po.poNumber.startsWith('CD/') ? 'Customer' : 'Supplier Record'),
        supplierAddress: po.supplier?.address || null,
        supplierContact: po.supplier?.phone || po.supplier?.email || null,
        createdByName: po.createdBy?.name || 'Authorized Staff',
        deliveryAddress: po.deliveryAddress,
        paymentTerms: po.paymentTerms,
        advanceAmount: adv,
        pendingAmount: pending,
        notes: po.notes,
        subtotal: Number(po.subtotal),
        discountTotal: Number(po.discountTotal),
        taxTotal: Number(po.taxTotal),
        grandTotal: Number(po.grandTotal),
        status: effectiveStatus,
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

    const isCDOrder = po.poNumber.startsWith('CD/');
    const paymentProofUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const paymentProofNotes = (req.body.proofNotes || notes || '').trim() || undefined;

    // Strict Mandatory Proof: CD settlements submitted by employee or on any CD record REQUIRE payment proof image
    if ((isCDOrder || req.user?.role === 'EMPLOYEE') && !paymentProofUrl && !po.paymentProofUrl) {
      return res.status(400).json({
        error: 'Buyer payment proof image (UPI screenshot, bank transfer receipt, or signed slip) is strictly mandatory for Customer Due settlements.',
      });
    }

    let comment = `Due Payment of ₹${paymentAmount.toLocaleString('en-IN')} received via ${paymentMode}.${reference ? ` Ref: ${reference}.` : ''} Remaining Due: ₹${finalPending.toLocaleString('en-IN')}.${notes ? ` Note: ${notes}` : ''}`;
    if (paymentProofUrl) {
      comment += ` [Proof Attached: ${paymentProofUrl}]`;
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        advanceAmount: finalAdvance,
        pendingAmount: finalPending,
        status: newStatus,
        ...(paymentProofUrl ? { paymentProofUrl } : {}),
        ...(paymentProofNotes ? { paymentProofNotes } : {}),
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

    clearDashboardCache();

    try {
      if (req.user?.role === 'EMPLOYEE' || paymentProofUrl) {
        await prisma.notification.create({
          data: {
            recipientRole: 'ADMIN',
            title: paymentProofUrl ? `Payment Proof Uploaded: ${po.poNumber}` : `Due Payment Recorded: ${po.poNumber}`,
            message: `${req.user?.name || 'Staff'} submitted ₹${paymentAmount.toLocaleString('en-IN')} payment for ${po.poNumber}.${paymentProofUrl ? ' Proof attached for verification.' : ''}`,
            linkUrl: `/purchase-orders/${po.id}?type=${isCDOrder ? 'CD' : 'PO'}&proof=true`,
          },
        });
      }
      if (newStatus === 'CLOSED' && po.createdById && req.user?.id !== po.createdById) {
        await prisma.notification.create({
          data: {
            userId: po.createdById,
            title: `Customer Due Settled & Closed: ${po.poNumber}`,
            message: `Your Customer Due ${po.poNumber} has been verified and marked as CLOSED by Admin.`,
            linkUrl: `/purchase-orders/${po.id}?type=${isCDOrder ? 'CD' : 'PO'}`,
          },
        });
      }
    } catch (notifErr) {
      console.warn('Failed to dispatch notification:', notifErr);
    }

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

      // Extract payment proof if uploaded
      const duePaymentProofUrl = req.file
        ? `/uploads/${req.file.filename}`
        : req.body.paymentProofUrl
        ? String(req.body.paymentProofUrl).trim()
        : null;

      const duePaymentProofNotes = req.body.paymentProofNotes
        ? String(req.body.paymentProofNotes).trim()
        : duePaymentProofUrl
        ? `Upfront payment proof: ${req.body.paymentMode || 'Payment'}`
        : null;

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
          paymentProofUrl: duePaymentProofUrl || null,
          paymentProofNotes: duePaymentProofNotes || null,
          status,
          notes: [
            req.body.orderPersonName ? `Order Taken By: ${String(req.body.orderPersonName).trim()}` : '',
            notes ? String(notes).trim() : '',
            'Customer Due (CD)'
          ].filter(Boolean).join(' | '),
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

export async function updatePurchaseOrder(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      buyerName,
      supplierName,
      customerPhone,
      orderPersonPlace,
      notes,
      expectedDeliveryDate,
      grandTotal,
      advanceAmount,
      pendingAmount,
    } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: true, createdBy: true },
    });

    if (!po) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isEmp = req.user?.role === 'EMPLOYEE';
    const isAdminOrAcc = req.user?.role === 'ADMIN' || req.user?.role === 'ACCOUNTANT';

    // Employee can only edit their own order
    if (isEmp && po.createdById !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied: You can only edit your own orders' });
    }

    const effectiveBuyerName = (buyerName || supplierName || '').trim();
    const isAmountAttempt = (
      grandTotal !== undefined && Number(grandTotal) !== Number(po.grandTotal)
    ) || (
      advanceAmount !== undefined && Number(advanceAmount) !== Number(po.advanceAmount || 0)
    ) || (
      pendingAmount !== undefined && Number(pendingAmount) !== Number(po.pendingAmount || 0)
    );

    if (isEmp && isAmountAttempt) {
      return res.status(403).json({
        error: 'Amount modification locked: Order amounts can only be modified with Admin or Accountant approval. Please request your Admin/Accountant to adjust this value.',
      });
    }

    const updateData: any = {};

    // Update buyer / supplier name and contact if provided
    if (effectiveBuyerName && effectiveBuyerName !== po.supplier.name) {
      // Check if any other purchase orders share this supplierId
      const otherOrdersCount = await prisma.purchaseOrder.count({
        where: {
          supplierId: po.supplierId,
          id: { not: po.id },
        },
      });

      if (otherOrdersCount === 0) {
        // Only this order uses this supplier, so safe to update in place
        await prisma.supplier.update({
          where: { id: po.supplierId },
          data: {
            name: effectiveBuyerName,
            phone: customerPhone || po.supplier.phone,
          },
        });
      } else {
        // Other orders share this supplier! Do NOT rename the shared supplier.
        // Look up if a supplier with the new name already exists or create a new one.
        let targetSupplier = await prisma.supplier.findFirst({
          where: { name: { equals: effectiveBuyerName, mode: 'insensitive' } },
        });

        if (!targetSupplier) {
          const supCount = await prisma.supplier.count();
          const supplierCode = `SUP-${String(supCount + 1).padStart(3, '0')}`;
          const isCDOrder = po.poNumber.startsWith('CD/') || po.supplier?.category === 'Customer Due';
          targetSupplier = await prisma.supplier.create({
            data: {
              name: effectiveBuyerName,
              supplierCode,
              phone: customerPhone || po.supplier?.phone,
              category: isCDOrder ? 'Customer Due' : 'Wholesale Fruits',
              paymentTerms: po.supplier?.paymentTerms || 'Custom',
              status: 'ACTIVE',
            },
          });
        }
        updateData.supplierId = targetSupplier.id;
      }
    }
    if (orderPersonPlace !== undefined) updateData.orderPersonPlace = orderPersonPlace ? String(orderPersonPlace).trim() : null;
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null;
    if (expectedDeliveryDate !== undefined) updateData.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null;

    if (isAdminOrAcc) {
      if (grandTotal !== undefined) updateData.grandTotal = Number(grandTotal);
      if (advanceAmount !== undefined) updateData.advanceAmount = Number(advanceAmount);
      if (pendingAmount !== undefined) updateData.pendingAmount = Number(pendingAmount);
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: { supplier: true, items: true, createdBy: true },
    });

    clearDashboardCache();

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'PO_UPDATED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `Order ${updated.poNumber} updated by ${req.user?.name || 'User'}${isAmountAttempt ? ' (Amounts updated)' : ''}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating purchase order:', error);
    return res.status(500).json({ error: error.message || 'Failed to update order' });
  }
}



