import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import {
  VENDOR_WHITELISTED_LOCATIONS,
  isValidVendorLocation,
} from '../constants/vendorConstants.js';
import { generateNextPONumber } from './purchaseOrderController.js';
import { enrichPOWithSettlementDetails } from '../utils/settlementHelper.js';
export { enrichPOWithSettlementDetails } from '../utils/settlementHelper.js';

/**
 * Generates sequential, collision-safe Vendor ID: VND-001, VND-002, etc.
 */
export async function generateNextVendorId(tx: any = prisma): Promise<string> {
  const existingVendors = await tx.vendorProfile.findMany({
    select: { vendorId: true },
  });

  let maxSeq = 0;
  for (const v of existingVendors) {
    const parts = v.vendorId.split('-');
    const seqNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seqNum) && seqNum > maxSeq) {
      maxSeq = seqNum;
    }
  }

  let nextSeq = maxSeq + 1;
  while (true) {
    const candidate = `VND-${String(nextSeq).padStart(3, '0')}`;
    const exists = await tx.vendorProfile.findUnique({
      where: { vendorId: candidate },
      select: { id: true },
    });
    if (!exists) {
      return candidate;
    }
    nextSeq++;
  }
}

/**
 * Mask Aadhaar number: XXXX-XXXX-1234
 */
function maskAadhaar(aadhaar: string): string {
  if (!aadhaar || aadhaar.length < 4) return aadhaar || '';
  const last4 = aadhaar.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * Mask Bank Account Number: XXXXXX1234
 */
function maskBankAccount(acc: string): string {
  if (!acc || acc.length < 4) return acc || '';
  const last4 = acc.slice(-4);
  return `XXXXXX${last4}`;
}

/**
 * GET /api/vendor/profile
 * Returns profile of the logged-in vendor.
 */
export async function getVendorProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'VENDOR') {
      return res.status(403).json({ error: 'Vendor access required' });
    }

    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            phone: true,
            isActive: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    return res.json({
      vendor: {
        id: profile.id,
        vendorId: profile.vendorId,
        businessName: profile.businessName,
        contactPerson: profile.contactPerson,
        phone: profile.phone,
        email: profile.email || profile.user.email,
        primaryLocation: profile.primaryLocation,
        aadharNumberMasked: maskAadhaar(profile.aadharNumber),
        aadharNumber: profile.aadharNumber,
        panNumber: profile.panNumber,
        bankAccountNumberMasked: maskBankAccount(profile.bankAccountNumber),
        bankAccountNumber: profile.bankAccountNumber,
        bankIfscCode: profile.bankIfscCode,
        bankAccountHolder: profile.bankAccountHolder,
        bankName: profile.bankName,
        bankBranch: profile.bankBranch,
        isKycLocked: profile.isKycLocked,
        kycLockedAt: profile.kycLockedAt,
        status: profile.status,
        allowedLocations: VENDOR_WHITELISTED_LOCATIONS,
      },
    });
  } catch (error: any) {
    console.error('getVendorProfile error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vendor profile' });
  }
}

/**
 * PUT /api/vendor/profile
 * Allows vendor to update business name, contact person, phone, primary location,
 * banking coordinates and tax IDs.
 */
export async function updateVendorProfile(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'VENDOR') {
      return res.status(403).json({ error: 'Vendor access required' });
    }

    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const {
      businessName,
      contactPerson,
      phone,
      email,
      primaryLocation,
      bankAccountNumber,
      bankIfscCode,
      bankAccountHolder,
      bankName,
      bankBranch,
      aadharNumber,
      panNumber,
    } = req.body;

    if (primaryLocation && !isValidVendorLocation(primaryLocation)) {
      return res.status(400).json({
        error: `Invalid primary hub location "${primaryLocation}". Must be one of: ${VENDOR_WHITELISTED_LOCATIONS.join(', ')}`,
      });
    }

    const updated = await prisma.vendorProfile.update({
      where: { id: profile.id },
      data: {
        businessName: businessName?.trim() || profile.businessName,
        contactPerson: contactPerson?.trim() || profile.contactPerson,
        phone: phone?.trim() || profile.phone,
        email: email !== undefined ? (email ? email.trim() : null) : profile.email,
        primaryLocation: primaryLocation || profile.primaryLocation,
        bankAccountNumber: bankAccountNumber?.trim() || profile.bankAccountNumber,
        bankIfscCode: bankIfscCode ? bankIfscCode.toUpperCase().trim() : profile.bankIfscCode,
        bankAccountHolder: bankAccountHolder?.trim() || profile.bankAccountHolder,
        bankName: bankName?.trim() || profile.bankName,
        bankBranch: bankBranch?.trim() || profile.bankBranch,
        aadharNumber: aadharNumber?.trim() || profile.aadharNumber,
        panNumber: panNumber ? panNumber.toUpperCase().trim() : profile.panNumber,
      },
    });

    // Synchronize linked supplier record if exists
    if (businessName || contactPerson || phone) {
      await prisma.supplier.updateMany({
        where: {
          OR: [
            { supplierCode: profile.vendorId },
            { name: profile.businessName },
          ],
        },
        data: {
          name: businessName?.trim() || profile.businessName,
          contactPerson: contactPerson?.trim() || profile.contactPerson,
          phone: phone?.trim() || profile.phone,
        },
      }).catch((err) => console.warn('Supplier sync error on vendor profile update:', err));

      // Keep user display name synced
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          name: contactPerson?.trim() || businessName?.trim() || req.user.name,
          phone: phone?.trim() || undefined,
        },
      }).catch((err) => console.warn('User sync error on vendor profile update:', err));
    }

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'VENDOR_PROFILE_UPDATED',
      entityType: 'VENDOR',
      entityId: profile.id,
      details: `Vendor ${profile.vendorId} updated profile details`,
      ipAddress: req.ip,
    });

    return res.json({
      message: 'Profile updated successfully',
      vendor: updated,
    });
  } catch (error: any) {
    console.error('updateVendorProfile error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
}

/**
 * GET /api/vendor/purchase-orders
 * Lists all purchase orders assigned to this vendor.
 */
export async function getVendorPOs(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'VENDOR') {
      return res.status(403).json({ error: 'Vendor access required' });
    }

    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Match either via vendorProfileId OR via supplierCode matching vendorId OR supplier name containing vendor business name
    const pos = await prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { vendorProfileId: profile.id },
          { supplier: { supplierCode: profile.vendorId } },
          { supplier: { name: { contains: profile.businessName, mode: 'insensitive' } } },
        ],
      },
      include: {
        items: true,
        financialRecord: true,
        supplier: {
          select: {
            name: true,
            supplierCode: true,
          },
        },
      },
      orderBy: { poDate: 'desc' },
    });

    const sanitizedPOs = pos.map((p) => {
      // An order is strictly in transit ONLY if:
      // 1. Vehicle is allotted
      // 2. Loading proof (photo) is uploaded
      // 3. Dispatch has actually been submitted by vendor (dispatchDate is recorded)
      const hasVehicle = Boolean(p.dispatchVehicleNumber && p.dispatchVehicleNumber !== '-');
      const hasProof = Boolean(p.vehiclePhotoUrl);
      const hasDispatchDate = Boolean(p.dispatchDate);
      let dispatchStatus = p.dispatchStatus;
      if ((dispatchStatus === 'LOADED_AND_DISPATCHED' || dispatchStatus === 'IN_TRANSIT') && (!hasVehicle || !hasProof || !hasDispatchDate)) {
        dispatchStatus = 'PENDING_DISPATCH';
      }
      return {
        ...p,
        dispatchStatus,
      };
    });

    const enriched = sanitizedPOs.map((p) => enrichPOWithSettlementDetails(p));
    return res.json(enriched);
  } catch (error: any) {
    console.error('getVendorPOs error:', error);
    return res.status(500).json({ error: 'Failed to retrieve purchase orders' });
  }
}

/**
 * POST /api/vendor/dispatch
 * Submits vehicle number, vehicle photo (with number plate), and transport bill.
 * Expects multipart/form-data with fields:
 * - poId (string)
 * - dispatchVehicleNumber (string)
 * - transporterName (string, optional)
 * - driverPhone (string, optional)
 * Files:
 * - vehiclePhoto (file)
 * - transportBill (file)
 */
export async function submitPODispatch(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'VENDOR') {
      return res.status(403).json({ error: 'Vendor access required' });
    }

    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const { poId, dispatchVehicleNumber, transporterName, driverPhone } = req.body;

    if (!poId) {
      return res.status(400).json({ error: 'Purchase Order ID (poId) is required' });
    }

    if (!dispatchVehicleNumber || !dispatchVehicleNumber.trim()) {
      return res.status(400).json({ error: 'Vehicle Registration Number is required' });
    }

    // Handle files from multer
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let vehiclePhotoUrl = req.body.vehiclePhotoUrl;
    let transportBillUrl = req.body.transportBillUrl || req.body.vendorSignature;

    if (files && files['vehiclePhoto'] && files['vehiclePhoto'][0]) {
      vehiclePhotoUrl = `/uploads/${files['vehiclePhoto'][0].filename}`;
    }

    if (files && files['transportBill'] && files['transportBill'][0]) {
      transportBillUrl = `/uploads/${files['transportBill'][0].filename}`;
    } else if (files && files['vendorSignature'] && files['vendorSignature'][0]) {
      transportBillUrl = `/uploads/${files['vendorSignature'][0].filename}`;
    }

    if (!vehiclePhotoUrl) {
      return res.status(400).json({
        error:
          'Vehicle Photo is required! Please upload a clear photo showing the vehicle number plate.',
      });
    }

    if (!transportBillUrl) {
      return res.status(400).json({
        error:
          'Vendor Digital E-Signature or Transport Bill is required! Please complete your signature or upload transport bilty.',
      });
    }

    // Verify PO belongs to this vendor
    const po = await prisma.purchaseOrder.findFirst({
      where: {
        id: poId,
        OR: [
          { vendorProfileId: profile.id },
          { supplier: { supplierCode: profile.vendorId } },
        ],
      },
      include: {
        items: true,
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found or not assigned to your account' });
    }

    // Preserve the Admin-uploaded Bilty, with fallback to any newly supplied transport bill or signature
    const finalBilty = po.transportBillUrl || transportBillUrl;

    // Process loaded items if submitted during dispatch
    let dispatchItems: Array<{
      fruitName: string;
      category: string;
      varietyGrade: string;
      quantity: number;
      unit: string;
      ratePerUnit: number;
      lineTotal: number;
    }> = [];

    if (req.body.items) {
      try {
        const parsed = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;
        if (Array.isArray(parsed) && parsed.length > 0) {
          dispatchItems = parsed.map((it: any) => ({
            fruitName: it.fruitName || req.body.fruitName || 'Kashmir Apples',
            category: 'Fresh Fruits',
            varietyGrade: it.varietyGrade || 'Grade A',
            quantity: Number(it.quantity) || 0,
            unit: it.unit || 'BOX',
            ratePerUnit: Number(it.ratePerUnit) || 0,
            lineTotal: Number(it.lineTotal) || (Number(it.quantity) * Number(it.ratePerUnit)),
          }));
        }
      } catch {}
    }

    const d4LBoxes = Number(req.body.layer4LBoxes) || 0;
    const d4LRate = Number(req.body.layer4LRate) || 0;
    const d5LBoxes = Number(req.body.layer5LBoxes) || 0;
    const d5LRate = Number(req.body.layer5LRate) || 0;
    const dRollBoxes = Number(req.body.rollBoxes) || 0;
    const dRollRate = Number(req.body.rollRate) || 0;

    if (d4LBoxes > 0 || d5LBoxes > 0 || dRollBoxes > 0) {
      dispatchItems = [];
      const fruitLabel = req.body.fruitName || 'Kashmir Apples';
      if (d4LBoxes > 0) {
        dispatchItems.push({
          fruitName: fruitLabel,
          category: 'Fresh Fruits',
          varietyGrade: '4L (4-Layer Large Size)',
          quantity: d4LBoxes,
          unit: 'BOX',
          ratePerUnit: d4LRate,
          lineTotal: d4LBoxes * d4LRate,
        });
      }
      if (d5LBoxes > 0) {
        dispatchItems.push({
          fruitName: fruitLabel,
          category: 'Fresh Fruits',
          varietyGrade: '5L (5-Layer Medium Size)',
          quantity: d5LBoxes,
          unit: 'BOX',
          ratePerUnit: d5LRate,
          lineTotal: d5LBoxes * d5LRate,
        });
      }
      if (dRollBoxes > 0) {
        dispatchItems.push({
          fruitName: fruitLabel,
          category: 'Fresh Fruits',
          varietyGrade: 'Roll (Roller Mixed Run)',
          quantity: dRollBoxes,
          unit: 'BOX',
          ratePerUnit: dRollRate,
          lineTotal: dRollBoxes * dRollRate,
        });
      }
    }

    let calculatedGrandTotal = Number(po.grandTotal);
    if (dispatchItems.length > 0) {
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: po.id },
      });
      await prisma.purchaseOrderItem.createMany({
        data: dispatchItems.map((it) => ({
          purchaseOrderId: po.id,
          fruitName: it.fruitName,
          category: it.category,
          varietyGrade: it.varietyGrade,
          quantity: it.quantity,
          unit: it.unit,
          ratePerUnit: it.ratePerUnit,
          lineTotal: it.lineTotal,
        })),
      });
      calculatedGrandTotal = dispatchItems.reduce((sum, it) => sum + (it.lineTotal > 0 ? it.lineTotal : 0), 0);
    }

    const autoAdvance = Math.round(calculatedGrandTotal * 0.55);

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        ...(dispatchItems.length > 0
          ? {
              subtotal: calculatedGrandTotal,
              grandTotal: calculatedGrandTotal,
              advanceAmount: autoAdvance,
              pendingAmount: Math.max(0, calculatedGrandTotal - autoAdvance),
              autoAdvanceCalculated: autoAdvance,
            }
          : {}),
        dispatchVehicleNumber: dispatchVehicleNumber.trim().toUpperCase(),
        vehiclePhotoUrl,
        transportBillUrl: finalBilty,
        transporterName: transporterName || po.transporterName || null,
        driverPhone: driverPhone || po.driverPhone || null,
        dispatchDate: new Date(),
        dispatchStatus: 'LOADED_AND_DISPATCHED',
      },
    });

    // Create Audit Log
    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'VENDOR_PO_DISPATCHED',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      details: `Vendor ${profile.vendorId} dispatched PO ${po.poNumber} with vehicle ${dispatchVehicleNumber.toUpperCase()}`,
      ipAddress: req.ip,
    });

    // Send notifications to Admin and Accountant
    const adminUsers = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'ACCOUNTANT'] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const admin of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: `Truck Dispatched: ${po.poNumber}`,
          message: `Vendor ${profile.businessName} (${profile.vendorId}) dispatched PO ${po.poNumber} with Vehicle ${dispatchVehicleNumber.toUpperCase()}. Transport bill and vehicle photo attached.`,
          type: 'INFO',
          linkUrl: '/purchase-orders',
        },
      });
    }

    return res.json({
      message: 'Dispatch details recorded successfully! Safal Admin has been notified.',
      purchaseOrder: updatedPO,
    });
  } catch (error: any) {
    console.error('submitPODispatch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to record dispatch details' });
  }
}

/**
 * GET /api/vendor/dashboard-stats
 * Returns live KPI metrics for vendor operations dashboard.
 */
export async function getVendorDashboardStats(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'VENDOR') {
      return res.status(403).json({ error: 'Vendor access required' });
    }

    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    const pos = await prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { vendorProfileId: profile.id },
          { supplier: { supplierCode: profile.vendorId } },
          { supplier: { name: { contains: profile.businessName, mode: 'insensitive' } } },
        ],
      },
      include: {
        financialRecord: true,
      },
    });

    const enriched = pos.map((p) => enrichPOWithSettlementDetails(p));

    const totalPOs = pos.length;
    const inTransitPOs = pos.filter(
      (p) =>
        (p.dispatchStatus === 'LOADED_AND_DISPATCHED' || p.dispatchStatus === 'IN_TRANSIT') &&
        Boolean(p.dispatchVehicleNumber && p.dispatchVehicleNumber !== '-') &&
        Boolean(p.vehiclePhotoUrl) &&
        Boolean(p.dispatchDate) &&
        p.status !== 'CLOSED'
    ).length;
    const pendingDispatchPOs = pos.filter(
      (p) => (!p.dispatchStatus || p.dispatchStatus === 'PENDING_DISPATCH') && p.status !== 'CLOSED' && p.status !== 'CANCELLED'
    ).length;
    const awaitingClearancePOs = pos.filter(
      (p) => (p.dispatchStatus === 'DELIVERED_AT_HUB' || p.dispatchVehicleNumber) && p.status !== 'CLOSED'
    ).length;
    const deliveredPOs = enriched.filter(
      (p) => p.settlementDetails?.settlementCompleted && Number(p.settlementDetails?.finalBalanceDue || 0) === 0
    ).length;

    const totalOrderValue = enriched.reduce((sum, p) => sum + Number(p.grandTotal || 0), 0);
    const totalAdvanceReceived = enriched.reduce((sum, p) => sum + Number(p.settlementDetails?.advanceAmount || p.advanceAmount || 0), 0);
    const totalSafalShare = enriched.reduce((sum, p) => sum + Number(p.settlementDetails?.adminShareAmount || 0), 0);
    const totalApmcShare = enriched.reduce((sum, p) => sum + Number(p.settlementDetails?.apmcShareAmount || 0), 0);
    const totalNetPayable = enriched.reduce((sum, p) => sum + Number(p.settlementDetails?.netVendorPayable || 0), 0);
    const totalPendingBalance = enriched.reduce((sum, p) => sum + Number(p.settlementDetails?.finalBalanceDue || 0), 0);

    return res.json({
      vendorId: profile.vendorId,
      businessName: profile.businessName,
      location: profile.primaryLocation,
      stats: {
        totalPOs,
        inTransitPOs,
        pendingDispatchPOs,
        deliveredPOs,
        totalOrderValue,
        totalAdvanceReceived,
        totalPendingBalance,
        totalSafalShare,
        totalApmcShare,
        totalNetPayable,
      },
      whitelistedLocations: VENDOR_WHITELISTED_LOCATIONS,
    });
  } catch (error: any) {
    console.error('getVendorDashboardStats error:', error);
    return res.status(500).json({ error: 'Failed to retrieve vendor dashboard stats' });
  }
}

// ============================================================================
// ADMIN VENDOR MANAGEMENT APIS
// ============================================================================

/**
 * GET /api/vendor/admin/all
 * Lists all registered vendors with full details and stats.
 */
export async function getAllVendors(req: AuthRequest, res: Response) {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'ACCOUNTANT')) {
      return res.status(403).json({ error: 'Admin or Accountant access required' });
    }

    const vendors = await prisma.vendorProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        _count: {
          select: {
            purchaseOrders: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(vendors);
  } catch (error: any) {
    console.error('getAllVendors error:', error);
    return res.status(500).json({ error: 'Failed to list vendors' });
  }
}

/**
 * GET /api/vendor/admin/operations
 * Returns all vendor consignments, dispatches, and weighbridge scale slips for Admin & Accountant.
 */
export async function getVendorOperationsForAdmin(req: AuthRequest, res: Response) {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'ACCOUNTANT')) {
      return res.status(403).json({ error: 'Admin or Accountant access required' });
    }

    const operations = await prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { vendorProfileId: { not: null } },
          { supplier: { supplierCode: { startsWith: 'VND' } } },
          { dispatchVehicleNumber: { not: null } },
          { weighbridgeGrossKg: { not: null } },
          { createdBy: { role: 'VENDOR' } },
        ],
      },
      include: {
        items: true,
        financialRecord: true,
        supplier: {
          select: {
            id: true,
            name: true,
            supplierCode: true,
            phone: true,
            address: true,
          },
        },
        vendorProfile: {
          select: {
            id: true,
            vendorId: true,
            businessName: true,
            contactPerson: true,
            phone: true,
            primaryLocation: true,
            bankAccountNumber: true,
            bankIfscCode: true,
            bankName: true,
            bankBranch: true,
          },
        },
      },
      orderBy: { poDate: 'desc' },
    });

    const enriched = operations.map((op) => enrichPOWithSettlementDetails(op));
    return res.json(enriched);
  } catch (error: any) {
    console.error('getVendorOperationsForAdmin error:', error);
    return res.status(500).json({ error: 'Failed to list vendor operations' });
  }
}

/**
 * POST /api/vendor/admin/create
 * Admin creates a new vendor with verified KYC & bank details.
 * Auto-generates VND-XXX ID and sets isKycLocked: true.
 */
export async function createVendor(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Full Administrator access required to create vendors' });
    }

    const {
      businessName,
      contactPerson,
      phone,
      email,
      primaryLocation,
      aadharNumber,
      panNumber,
      bankAccountNumber,
      bankIfscCode,
      bankAccountHolder,
      bankName,
      bankBranch,
      password,
      isKycLocked = true,
    } = req.body;

    if (!businessName || !contactPerson || !phone || !aadharNumber || !panNumber || !bankAccountNumber || !bankIfscCode || !bankAccountHolder) {
      return res.status(400).json({
        error:
          'Required fields missing: Business Name, Contact Person, Phone, Aadhaar, PAN, and Bank Details are mandatory.',
      });
    }

    // Validate location
    if (!isValidVendorLocation(primaryLocation)) {
      return res.status(400).json({
        error: `Invalid location "${primaryLocation}". Please enter a valid vendor origin location.`,
      });
    }

    // Check duplicate email / phone
    const normalizedEmail = email ? email.toLowerCase().trim() : `${phone.trim()}@vendor.safalexports.com`;
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phone: phone.trim() }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        error: `A user with email ${normalizedEmail} or phone ${phone} already exists in the system.`,
      });
    }

    // Generate next Vendor ID (e.g. VND-001)
    const vendorId = await generateNextVendorId();

    // Password
    const initialPassword = password || 'Safal@2026';
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    // Create User, VendorProfile, and corresponding Supplier record inside a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: contactPerson,
          role: 'VENDOR',
          department: 'Vendor Procurement',
          designation: 'Wholesale Supplier',
          phone: phone.trim(),
          isActive: true,
        },
      });

      const vendor = await tx.vendorProfile.create({
        data: {
          vendorId,
          userId: user.id,
          businessName: businessName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          email: email ? email.trim() : null,
          primaryLocation: primaryLocation.trim(),
          aadharNumber: aadharNumber.trim(),
          panNumber: panNumber.trim().toUpperCase(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankIfscCode: bankIfscCode.trim().toUpperCase(),
          bankAccountHolder: bankAccountHolder.trim(),
          bankName: bankName ? bankName.trim() : null,
          bankBranch: bankBranch ? bankBranch.trim() : null,
          isKycLocked: Boolean(isKycLocked),
          kycLockedAt: isKycLocked ? new Date() : null,
          status: 'ACTIVE',
        },
      });

      // Also ensure a Supplier record exists with supplierCode = vendorId for seamless procurement linking
      const existingSupplier = await tx.supplier.findUnique({
        where: { supplierCode: vendorId },
      });

      if (!existingSupplier) {
        await tx.supplier.create({
          data: {
            supplierCode: vendorId,
            name: businessName.trim(),
            contactPerson: contactPerson.trim(),
            email: email ? email.trim() : null,
            phone: phone.trim(),
            address: `${primaryLocation.trim()}, India`,
            category: 'Wholesale Fruits (Vendor)',
            paymentTerms: '70% Advance / Balance on Delivery',
            status: 'ACTIVE',
            notes: `Auto-linked to Vendor Portal ${vendorId} (Aadhaar: ${maskAadhaar(
              aadharNumber
            )}, PAN: ${panNumber.trim().toUpperCase()})`,
          },
        });
      }

      return { user, vendor };
    });

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADMIN_CREATE_VENDOR',
      entityType: 'VENDOR',
      entityId: result.vendor.id,
      details: `Admin created vendor ${vendorId} (${businessName}) for location ${primaryLocation} with frozen KYC`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: `Vendor ${vendorId} created successfully!`,
      vendorId,
      initialPassword,
      vendor: result.vendor,
    });
  } catch (error: any) {
    console.error('createVendor error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create vendor' });
  }
}

/**
 * PATCH /api/vendor/admin/:id/toggle-lock
 * Admin toggles KYC freeze lock for a vendor.
 */
export async function toggleVendorKycLock(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Full Administrator can lock or unlock vendor KYC' });
    }

    const { id } = req.params;
    const vendor = await prisma.vendorProfile.findUnique({ where: { id } });

    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const newLockState = !vendor.isKycLocked;
    const updated = await prisma.vendorProfile.update({
      where: { id },
      data: {
        isKycLocked: newLockState,
        kycLockedAt: newLockState ? new Date() : null,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: newLockState ? 'ADMIN_LOCK_VENDOR_KYC' : 'ADMIN_UNLOCK_VENDOR_KYC',
      entityType: 'VENDOR',
      entityId: vendor.id,
      details: `Admin ${req.user.name} ${newLockState ? 'locked' : 'unlocked'} KYC for vendor ${vendor.vendorId}`,
      ipAddress: req.ip,
    });

    return res.json({
      message: `Vendor ${vendor.vendorId} KYC has been ${newLockState ? 'permanently locked' : 'unlocked for editing'}.`,
      vendor: updated,
    });
  } catch (error: any) {
    console.error('toggleVendorKycLock error:', error);
    return res.status(500).json({ error: error.message || 'Failed to toggle KYC lock' });
  }
}

/**
 * PUT /api/vendor/admin/:id
 * Admin updates vendor bank & KYC details.
 */
export async function updateVendorByAdmin(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Full Administrator can update vendor records' });
    }

    const { id } = req.params;
    const {
      businessName,
      contactPerson,
      phone,
      email,
      primaryLocation,
      aadharNumber,
      panNumber,
      bankAccountNumber,
      bankIfscCode,
      bankAccountHolder,
      bankName,
      bankBranch,
      password,
      status,
      isKycLocked,
    } = req.body;

    if (primaryLocation && !isValidVendorLocation(primaryLocation)) {
      return res.status(400).json({
        error: `Invalid location "${primaryLocation}". Please enter a valid vendor origin location.`,
      });
    }

    const existingProfile = await prisma.vendorProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existingProfile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Check duplicate phone if modified
    if (phone && phone.trim() !== existingProfile.phone) {
      const duplicatePhone = await prisma.vendorProfile.findFirst({
        where: {
          phone: phone.trim(),
          id: { not: id },
        },
      });
      if (duplicatePhone) {
        return res.status(400).json({
          error: `Phone number ${phone} is already registered to vendor ${duplicatePhone.vendorId}`,
        });
      }
    }

    const updated = await prisma.vendorProfile.update({
      where: { id },
      data: {
        businessName: businessName?.trim() || existingProfile.businessName,
        contactPerson: contactPerson?.trim() || existingProfile.contactPerson,
        phone: phone?.trim() || existingProfile.phone,
        email: email !== undefined ? (email ? email.trim() : null) : existingProfile.email,
        primaryLocation: primaryLocation?.trim() || existingProfile.primaryLocation,
        aadharNumber: aadharNumber?.trim() || existingProfile.aadharNumber,
        panNumber: panNumber ? panNumber.trim().toUpperCase() : existingProfile.panNumber,
        bankAccountNumber: bankAccountNumber?.trim() || existingProfile.bankAccountNumber,
        bankIfscCode: bankIfscCode ? bankIfscCode.trim().toUpperCase() : existingProfile.bankIfscCode,
        bankAccountHolder: bankAccountHolder?.trim() || existingProfile.bankAccountHolder,
        bankName: bankName?.trim() || existingProfile.bankName,
        bankBranch: bankBranch?.trim() || existingProfile.bankBranch,
        status: status || existingProfile.status,
        isKycLocked: typeof isKycLocked === 'boolean' ? isKycLocked : existingProfile.isKycLocked,
        kycLockedAt:
          typeof isKycLocked === 'boolean'
            ? isKycLocked
              ? existingProfile.kycLockedAt || new Date()
              : null
            : undefined,
      },
    });

    // Synchronize linked user credentials and contact details
    if (existingProfile.userId) {
      const userUpdates: any = {};
      if (contactPerson || businessName) {
        userUpdates.name = contactPerson?.trim() || businessName?.trim();
      }
      if (phone) {
        userUpdates.phone = phone.trim();
      }
      if (email !== undefined) {
        userUpdates.email = email
          ? email.trim().toLowerCase()
          : `${(phone || existingProfile.phone).trim()}@vendor.safalexports.com`;
      }
      if (password && password.trim()) {
        userUpdates.passwordHash = await bcrypt.hash(password.trim(), 10);
      }
      if (Object.keys(userUpdates).length > 0) {
        await prisma.user
          .update({
            where: { id: existingProfile.userId },
            data: userUpdates,
          })
          .catch((err) => console.warn('User sync error on vendor admin update:', err));
      }
    }

    // Synchronize linked supplier record if exists
    if (businessName || contactPerson || phone) {
      await prisma.supplier
        .updateMany({
          where: {
            OR: [
              { supplierCode: existingProfile.vendorId },
              { name: existingProfile.businessName },
            ],
          },
          data: {
            name: businessName?.trim() || existingProfile.businessName,
            contactPerson: contactPerson?.trim() || existingProfile.contactPerson,
            phone: phone?.trim() || existingProfile.phone,
          },
        })
        .catch((err) => console.warn('Supplier sync error on vendor admin update:', err));
    }

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADMIN_UPDATE_VENDOR',
      entityType: 'VENDOR',
      entityId: id,
      details: `Admin ${req.user.name} updated vendor ${updated.vendorId} (${updated.businessName}) details`,
      ipAddress: req.ip,
    });

    return res.json({
      message: `Vendor ${updated.vendorId} updated successfully`,
      vendor: updated,
    });
  } catch (error: any) {
    console.error('updateVendorByAdmin error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update vendor' });
  }
}

/**
 * POST /api/vendor/po/:id/qc-inspection
 * Records Hub Weighbridge (Gross, Tare, Net KG) and QC Quality Grading inspection.
 * Uploads weighbridge slip photo or PDF.
 */
export async function submitHubQCInspection(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const {
      weighbridgeGrossKg,
      weighbridgeTareKg,
      qcInspectionStatus = 'PASSED',
      qcGradeARatio,
      qcGradeBRatio,
      qcWastageKg,
      qcInspectorName,
      qcInspectionRemarks,
    } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendorProfile: { include: { user: true } },
        supplier: true,
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    // If caller is a Vendor, ensure the PO belongs to this vendor
    if (req.user.role === 'VENDOR') {
      const profile = await prisma.vendorProfile.findUnique({
        where: { userId: req.user.id },
      });
      if (
        !profile ||
        (po.vendorProfileId &&
          po.vendorProfileId !== profile.id &&
          po.supplier?.supplierCode !== profile.vendorId &&
          !po.supplier?.name?.includes(profile.businessName))
      ) {
        return res.status(403).json({ error: 'You are only authorized to record weighbridge slips for your own consignments' });
      }
    }

    const gross = Number(weighbridgeGrossKg) || 0;
    const tare = Number(weighbridgeTareKg) || 0;
    const net = Math.max(0, gross - tare);

    const slipFile = req.file;
    const weighbridgeSlipUrl = slipFile ? `/uploads/${slipFile.filename}` : undefined;

    const updated = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        weighbridgeGrossKg: gross > 0 ? gross : undefined,
        weighbridgeTareKg: tare > 0 ? tare : undefined,
        weighbridgeNetKg: net > 0 ? net : undefined,
        weighbridgeSlipUrl: weighbridgeSlipUrl || po.weighbridgeSlipUrl,
        qcInspectionStatus: qcInspectionStatus || 'PASSED',
        qcGradeARatio: qcGradeARatio ? Number(qcGradeARatio) : undefined,
        qcGradeBRatio: qcGradeBRatio ? Number(qcGradeBRatio) : undefined,
        qcWastageKg: qcWastageKg ? Number(qcWastageKg) : undefined,
        qcInspectorName: qcInspectorName || req.user.name,
        qcInspectionDate: new Date(),
        qcInspectionRemarks: qcInspectionRemarks || undefined,
        dispatchStatus: 'DELIVERED_AT_HUB',
      },
    });

    // Notify Vendor User
    if (po.vendorProfile?.user?.id) {
      await prisma.notification.create({
        data: {
          userId: po.vendorProfile.user.id,
          recipientRole: 'VENDOR',
          title: `Weighbridge & QC Verified: ${po.poNumber}`,
          message: `Consignment Net Weight: ${net.toLocaleString('en-IN')} KG verified. Status: ${qcInspectionStatus}. Inspect digital slip in your dashboard.`,
          type: 'INFO',
          linkUrl: `/dashboard`,
        },
      });
    }

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'PO_QC_WEIGHBRIDGE_RECORDED',
      entityType: 'PURCHASE_ORDER',
      entityId: id,
      details: `${po.poNumber} weighbridge net: ${net} KG, QC: ${qcInspectionStatus}`,
      ipAddress: req.ip,
    });

    return res.json({
      message: 'Weighbridge & QC Inspection recorded successfully',
      purchaseOrder: updated,
    });
  } catch (error: any) {
    console.error('submitHubQCInspection error:', error);
    return res.status(500).json({ error: error.message || 'Failed to record QC inspection' });
  }
}

/**
 * POST /api/vendor/supply-po
 * Specialized Wholesale Fruit Supply Consignment creation for Vendors.
 * Supports:
 * - Dynamic Apple Sizing (4L, 5L, Roll, Total Boxes, Total Amount)
 * - Direct upload of Vehicle Photo and Transport Bill (Bilty)
 * - 55% automatic advance guarantee calculation
 * - Direct mapping to destination regional hub
 */
export async function createVendorSupplyPO(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== 'VENDOR') {
      return res.status(403).json({ error: 'Vendor access required' });
    }

    const profile = await prisma.vendorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Vendor profile not found' });
    }

    // Resolve or find supplier record linked to this vendor
    let supplier = await prisma.supplier.findFirst({
      where: {
        OR: [
          { supplierCode: profile.vendorId },
          { name: profile.businessName },
        ],
      },
    });

    if (!supplier) {
      supplier = await prisma.supplier.create({
        data: {
          supplierCode: profile.vendorId,
          name: profile.businessName,
          contactPerson: profile.contactPerson,
          phone: profile.phone,
          category: 'Wholesale Fruits',
          paymentTerms: '55% Advance on Dispatch + 45% on QC Acceptance',
          status: 'ACTIVE',
        },
      });
    }

    const {
      destinationHub,
      originLocation,
      startingLocation,
      vendorSignature,
      expectedDeliveryDate,
      poInitiateDate,
      poDate,
      fruitName,
      items: rawItems,
      dispatchVehicleNumber,
      transporterName,
      driverPhone,
      notes,
    } = req.body;

    const resolvedOrigin = (startingLocation || originLocation || '').trim();
    const targetHub = destinationHub || profile.primaryLocation || 'Warangal';
    if (!isValidVendorLocation(targetHub)) {
      return res.status(400).json({
        error: `Invalid destination hub "${targetHub}". Allowed hubs: ${VENDOR_WHITELISTED_LOCATIONS.join(', ')}`,
      });
    }

    // Parse items if passed as stringified JSON or construct from layer fields
    let itemsToProcess: Array<{
      fruitName: string;
      category: string;
      varietyGrade: string;
      quantity: number;
      unit: string;
      ratePerUnit: number;
      lineTotal: number;
    }> = [];

    if (rawItems) {
      try {
        const parsed = typeof rawItems === 'string' ? JSON.parse(rawItems) : rawItems;
        if (Array.isArray(parsed) && parsed.length > 0) {
          itemsToProcess = parsed.map((it: any) => ({
            fruitName: it.fruitName || fruitName || 'Kashmir Apples',
            category: 'Fresh Fruits',
            varietyGrade: it.varietyGrade || 'Grade A',
            quantity: Number(it.quantity) || 0,
            unit: it.unit || 'BOX',
            ratePerUnit: Number(it.ratePerUnit) || 0,
            lineTotal: Number(it.lineTotal) || (Number(it.quantity) * Number(it.ratePerUnit)),
          }));
        }
      } catch (e) {
        console.warn('Could not parse items JSON:', e);
      }
    }

    // If apple layer fields are passed directly in body:
    const layer4LBoxes = Number(req.body.layer4LBoxes) || 0;
    const layer4LRate = Number(req.body.layer4LRate) || 0;
    const layer5LBoxes = Number(req.body.layer5LBoxes) || 0;
    const layer5LRate = Number(req.body.layer5LRate) || 0;
    const rollBoxes = Number(req.body.rollBoxes) || 0;
    const rollRate = Number(req.body.rollRate) || 0;

    if (layer4LBoxes > 0 || layer5LBoxes > 0 || rollBoxes > 0) {
      itemsToProcess = [];
      const fruitLabel = fruitName || 'Kashmir Apples';
      if (layer4LBoxes > 0) {
        itemsToProcess.push({
          fruitName: fruitLabel,
          category: 'Fresh Fruits',
          varietyGrade: '4L (4-Layer Large Size)',
          quantity: layer4LBoxes,
          unit: 'BOX',
          ratePerUnit: layer4LRate,
          lineTotal: layer4LBoxes * layer4LRate,
        });
      }
      if (layer5LBoxes > 0) {
        itemsToProcess.push({
          fruitName: fruitLabel,
          category: 'Fresh Fruits',
          varietyGrade: '5L (5-Layer Medium Size)',
          quantity: layer5LBoxes,
          unit: 'BOX',
          ratePerUnit: layer5LRate,
          lineTotal: layer5LBoxes * layer5LRate,
        });
      }
      if (rollBoxes > 0) {
        itemsToProcess.push({
          fruitName: fruitLabel,
          category: 'Fresh Fruits',
          varietyGrade: 'Roll (Roller Mixed Run)',
          quantity: rollBoxes,
          unit: 'BOX',
          ratePerUnit: rollRate,
          lineTotal: rollBoxes * rollRate,
        });
      }
    }

    if (itemsToProcess.length === 0) {
      const preferredFruit = fruitName || 'Wholesale Fruit Consignment';
      itemsToProcess.push({
        fruitName: preferredFruit,
        category: 'Fresh Fruits',
        varietyGrade: 'Route Allotment Requested (Box counts to be confirmed on loading)',
        quantity: 0,
        unit: 'BOX',
        ratePerUnit: 0,
        lineTotal: 0,
      });
    }

    const grandTotal = itemsToProcess.reduce((sum, it) => sum + (it.lineTotal > 0 ? it.lineTotal : 0), 0);
    const autoAdvance = Math.round(grandTotal * 0.55);
    const adminShare = Math.round(grandTotal * 0.05);
    const apmcShare = Math.round(grandTotal * 0.01);
    const netVendorPayable = Math.max(0, grandTotal - (adminShare + apmcShare));
    const pendingBalance = Math.max(0, netVendorPayable - autoAdvance);

    // Handle files if uploaded with creation
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let vehiclePhotoUrl: string | null = null;
    let transportBillUrl: string | null = null;

    if (files && files['vehiclePhoto'] && files['vehiclePhoto'][0]) {
      vehiclePhotoUrl = `/uploads/${files['vehiclePhoto'][0].filename}`;
    }
    if (files && files['transportBill'] && files['transportBill'][0]) {
      transportBillUrl = `/uploads/${files['transportBill'][0].filename}`;
    }

    // Phase 1: PO Creation by Vendor requests vehicle allotment from Safal Hub.
    // Vehicle, loading proof photos, and dispatch date remain null until Admin allots vehicle and Vendor submits dispatch.
    const dispatchStatus = 'PENDING_DISPATCH';

    // Atomic transaction to generate next PO number and create PO
    const newPO = await prisma.$transaction(async (tx) => {
      const poNumber = await generateNextPONumber(tx);

      return await tx.purchaseOrder.create({
        data: {
          poNumber,
          poDate: poInitiateDate ? new Date(poInitiateDate) : (poDate ? new Date(poDate) : new Date()),
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          supplierId: supplier.id,
          vendorProfileId: profile.id,
          createdById: req.user!.id,
          orderPersonPlace: resolvedOrigin || targetHub,
          deliveryAddress: resolvedOrigin
            ? `${resolvedOrigin} ➔ ${targetHub} Regional Hub Receiving Desk`
            : `${targetHub} Regional Hub Receiving Desk`,
          paymentTerms: '55% Advance on Dispatch + 45% on QC Acceptance',
          dispatchVehicleNumber: null,
          transporterName: null,
          driverPhone: null,
          vehiclePhotoUrl: null,
          transportBillUrl: null,
          dispatchStatus,
          dispatchDate: null,
          subtotal: grandTotal,
          grandTotal,
          advanceAmount: autoAdvance,
          autoAdvanceCalculated: autoAdvance,
          pendingAmount: pendingBalance,
          status: 'PENDING_APPROVAL',
          notes: notes ? `Vendor Consignment: ${notes}` : `Vendor supply consignment for ${targetHub} Hub`,
          items: {
            create: itemsToProcess.map((it) => ({
              fruitName: it.fruitName,
              category: it.category,
              varietyGrade: it.varietyGrade,
              quantity: it.quantity,
              unit: it.unit,
              ratePerUnit: it.ratePerUnit,
              discountPercent: 0,
              taxPercent: 0,
              lineTotal: it.lineTotal,
            })),
          },
          statusHistory: {
            create: {
              status: 'PENDING_APPROVAL',
              changedById: req.user!.id,
              comment: 'Vendor created supply consignment order with 55% auto-advance guarantee',
            },
          },
          financialRecord: {
            create: {
              financialStatus: 'PENDING_COST_DATA',
            },
          },
        },
        include: {
          items: true,
          supplier: true,
        },
      });
    });

    // Notify Safal Admin & Accountants that a vehicle allotment is required
    const adminAndAccountants = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'ACCOUNTANT'] }, isActive: true },
      select: { id: true },
    });

    for (const u of adminAndAccountants) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          recipientRole: 'ADMIN',
          type: 'PURCHASE_ORDER',
          title: `🚚 Vehicle Allotment Required: ${newPO.poNumber}`,
          message: `Vendor ${profile.businessName} requested Consignment PO ${newPO.poNumber} (Value: ₹${grandTotal.toLocaleString('en-IN')}) for ${resolvedOrigin || 'Farm Origin'} ➔ ${targetHub} Hub. Please allot a refrigerated vehicle.`,
          linkUrl: '/vendors',
        },
      }).catch(() => null);
    }

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'CREATE_VENDOR_SUPPLY_PO',
      entityType: 'PURCHASE_ORDER',
      entityId: newPO.id,
      details: JSON.stringify({
        poNumber: newPO.poNumber,
        grandTotal,
        autoAdvance,
        targetHub,
        itemsCount: itemsToProcess.length,
      }),
    }).catch(() => null);

    return res.status(201).json({
      message: `Consignment Supply PO ${newPO.poNumber} created successfully!`,
      po: newPO,
    });
  } catch (error: any) {
    console.error('createVendorSupplyPO error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create vendor supply PO' });
  }
}

/**
 * POST /api/vendor/admin/po/:id/disburse-advance
 * Admin disburses advance payment to Vendor's registered bank account and uploads payment receipt.
 */
export async function disburseVendorAdvance(req: AuthRequest, res: Response) {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'ACCOUNTANT')) {
      return res.status(403).json({ error: 'Admin or Accountant access required' });
    }

    const { id } = req.params;
    const {
      advanceAmount: rawAdvanceAmount,
      paymentMode = 'Bank Transfer (RTGS / NEFT)',
      utrNumber,
      paymentDate,
      payingHub,
      notes,
    } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendorProfile: { include: { user: true } },
        supplier: true,
        financialRecord: true,
        items: true,
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    const file = req.file;
    const advanceProofUrl = file ? `/uploads/${file.filename}` : (req.body.advanceProofUrl || null);

    const grandTotal = Number(po.grandTotal || 0);
    const advanceAmount = Number(rawAdvanceAmount) > 0 ? Number(rawAdvanceAmount) : Math.round(grandTotal * 0.55);

    const adminShareAmount = Math.round(grandTotal * 0.05);
    const apmcShareAmount = Math.round(grandTotal * 0.01);
    const totalDeductions = adminShareAmount + apmcShareAmount;
    const netVendorPayable = Math.max(0, grandTotal - totalDeductions);
    const pendingBalance = Math.max(0, netVendorPayable - advanceAmount);

    const hubName = payingHub || po.orderPersonPlace || 'Warangal Hub';
    const payDate = paymentDate || new Date().toISOString().split('T')[0];

    const advancePayload = {
      advanceDisbursed: true,
      advanceAmount,
      advancePaymentDate: payDate,
      advancePaymentMode: paymentMode,
      advancePaymentUtr: utrNumber || `RTGS-${Date.now()}`,
      advancePayingHub: hubName,
      advanceProofUrl,
      advanceNotes: notes || `Advance payment disbursed by ${hubName}`,
      advanceDisbursedAt: new Date().toISOString(),
      advanceDisbursedBy: req.user.name,
    };

    const updated = await prisma.$transaction(async (tx) => {
      if (po.financialRecord) {
        await tx.purchaseOrderFinancialRecord.update({
          where: { id: po.financialRecord.id },
          data: {
            costNotes: JSON.stringify(advancePayload),
            verifiedCost: advanceAmount,
          },
        });
      } else {
        await tx.purchaseOrderFinancialRecord.create({
          data: {
            purchaseOrderId: po.id,
            financialStatus: 'PENDING_COST_DATA',
            costNotes: JSON.stringify(advancePayload),
            verifiedCost: advanceAmount,
          },
        });
      }

      return await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          advanceAmount,
          pendingAmount: po.status === 'CLOSED' ? 0 : pendingBalance,
          paymentProofUrl: advanceProofUrl || po.paymentProofUrl,
          paymentProofNotes: utrNumber ? `Advance UTR: ${utrNumber}` : po.paymentProofNotes,
          statusHistory: {
            create: {
              status: po.status,
              changedById: req.user!.id,
              comment: `Advance payment of ₹${advanceAmount.toLocaleString('en-IN')} disbursed by ${hubName} via ${paymentMode}. UTR: ${utrNumber || 'N/A'}.`,
            },
          },
        },
        include: {
          items: true,
          supplier: true,
          vendorProfile: true,
          financialRecord: true,
        },
      });
    });

    // Notify vendor
    const vendorUserId = po.vendorProfile?.user?.id;
    if (vendorUserId) {
      await prisma.notification.create({
        data: {
          userId: vendorUserId,
          recipientRole: 'VENDOR',
          type: 'INFO',
          title: `Advance Paid by ${hubName}: ${po.poNumber}`,
          message: `Safal ${hubName} has cleared advance of ₹${advanceAmount.toLocaleString('en-IN')} via ${paymentMode} (UTR: ${utrNumber || 'N/A'}). Bank receipt proof attached.`,
          linkUrl: '/dashboard',
        },
      }).catch(() => null);
    }

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'VENDOR_ADVANCE_DISBURSED',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      details: `Advance ₹${advanceAmount.toLocaleString('en-IN')} paid by ${hubName} for ${po.poNumber} with proof`,
      ipAddress: req.ip,
    });

    return res.json({
      message: `Advance payment of ₹${advanceAmount.toLocaleString('en-IN')} successfully recorded for ${po.poNumber}!`,
      purchaseOrder: enrichPOWithSettlementDetails(updated),
    });
  } catch (error: any) {
    console.error('disburseVendorAdvance error:', error);
    return res.status(500).json({ error: error.message || 'Failed to disburse advance' });
  }
}

/**
 * POST /api/vendor/admin/po/:id/settle-balance
 * Settle final balance with 5% Admin Share and 1% APMC Market Cess deductions.
 * Marks PO as CLOSED (Cleared ✓).
 */
export async function settleVendorBalance(req: AuthRequest, res: Response) {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'ACCOUNTANT')) {
      return res.status(403).json({ error: 'Admin or Accountant access required' });
    }

    const { id } = req.params;
    const {
      finalBalancePaid: rawFinalPaid,
      paymentMode = 'Bank Transfer (RTGS / NEFT)',
      utrNumber,
      settlingHub,
      paymentDate,
      notes,
    } = req.body;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendorProfile: { include: { user: true } },
        supplier: true,
        financialRecord: true,
        items: true,
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    const file = req.file;
    const settlementProofUrl = file ? `/uploads/${file.filename}` : (req.body.settlementProofUrl || null);

    const grandTotal = Number(po.grandTotal || 0);
    const advanceAmount = Number(po.advanceAmount || 0);

    // Exact 5% Admin Share & 1% APMC Mandi Cess
    const adminShareAmount = Math.round(grandTotal * 0.05);
    const apmcShareAmount = Math.round(grandTotal * 0.01);
    const totalDeductions = adminShareAmount + apmcShareAmount;
    const netVendorPayable = Math.max(0, grandTotal - totalDeductions);
    const finalBalanceDue = Math.max(0, netVendorPayable - advanceAmount);
    const finalBalancePaid = Number(rawFinalPaid) > 0
      ? (finalBalanceDue > 0 ? Math.min(Number(rawFinalPaid), finalBalanceDue) : Number(rawFinalPaid))
      : finalBalanceDue;

    const hubName = settlingHub || po.orderPersonPlace || 'Warangal Hub';
    const payDate = paymentDate || new Date().toISOString().split('T')[0];

    const isFullySettled = finalBalancePaid >= finalBalanceDue;
    const remainingBalanceDue = Math.max(0, finalBalanceDue - finalBalancePaid);
    const updatedStatus = isFullySettled ? 'CLOSED' : 'OPEN';

    // Preserve or dynamically calculate trading P&L based on what Admin enters:
    const existingFin = po.financialRecord;
    let finalProfitLoss: number | null = existingFin?.realizedProfitLoss !== null && existingFin?.realizedProfitLoss !== undefined
      ? Number(existingFin.realizedProfitLoss)
      : null;
    let finalStatus: any = existingFin?.financialStatus || (finalProfitLoss !== null ? (finalProfitLoss >= 0 ? 'PROFIT' : 'LOSS') : 'PENDING_SALES_DATA');
    let verifiedCost = existingFin?.verifiedCost !== null && existingFin?.verifiedCost !== undefined
      ? Number(existingFin.verifiedCost)
      : grandTotal;
    let transport = Number(existingFin?.allocatedTransportCost || 0);
    let labor = Number(existingFin?.allocatedLaborCost || 0);
    let linkedRev = existingFin?.linkedRevenue !== null && existingFin?.linkedRevenue !== undefined
      ? Number(existingFin.linkedRevenue)
      : null;

    if (req.body.linkedRevenue !== undefined || req.body.closingPrice !== undefined) {
      if (req.body.closingPrice) {
        const totalQty = po.items?.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 0), 0) || 1;
        linkedRev = Math.round(Number(req.body.closingPrice) * totalQty);
      } else if (req.body.linkedRevenue) {
        linkedRev = Number(req.body.linkedRevenue);
      }
      if (req.body.allocatedTransportCost !== undefined) transport = Number(req.body.allocatedTransportCost) || 0;
      if (req.body.allocatedLaborCost !== undefined) labor = Number(req.body.allocatedLaborCost) || 0;
      if (req.body.verifiedCost !== undefined) verifiedCost = Number(req.body.verifiedCost) || grandTotal;

      const totalAssociatedCost = verifiedCost + transport + labor;
      finalProfitLoss = linkedRev! - totalAssociatedCost;
      finalStatus = finalProfitLoss > 0 ? 'PROFIT' : (finalProfitLoss < 0 ? 'LOSS' : 'BREAK_EVEN');
    }

    const settlementPayload = {
      settlementCompleted: isFullySettled,
      grossConsignmentTotal: grandTotal,
      adminSharePercent: 5,
      adminShareAmount,
      apmcSharePercent: 1,
      apmcShareAmount,
      totalMandiDeductions: totalDeductions,
      netVendorPayable,
      advanceAlreadyPaid: advanceAmount,
      finalBalanceDue: remainingBalanceDue,
      finalBalancePaid,
      finalPaymentDate: payDate,
      finalPaymentMode: paymentMode,
      finalPaymentUtr: utrNumber || `RTGS-${Date.now()}`,
      finalSettlingHub: hubName,
      finalSettlementProofUrl: settlementProofUrl,
      finalSettlementNotes: notes || `Settled by ${hubName} with 5% Admin Share & 1% APMC Mandi Cess`,
      settledAt: new Date().toISOString(),
      settledBy: req.user.name,
      vendorRealizedGain: netVendorPayable,
      platformRevenue: adminShareAmount,
      mandiCessPaid: apmcShareAmount,
      realizedProfitLoss: finalProfitLoss,
    };

    const updated = await prisma.$transaction(async (tx) => {
      if (existingFin) {
        await tx.purchaseOrderFinancialRecord.update({
          where: { id: existingFin.id },
          data: {
            revenueNotes: JSON.stringify(settlementPayload),
            linkedRevenue: linkedRev,
            verifiedCost,
            allocatedTransportCost: transport,
            allocatedLaborCost: labor,
            realizedProfitLoss: finalProfitLoss,
            financialStatus: finalStatus,
          },
        });
      } else {
        await tx.purchaseOrderFinancialRecord.create({
          data: {
            purchaseOrderId: po.id,
            financialStatus: finalStatus,
            revenueNotes: JSON.stringify(settlementPayload),
            linkedRevenue: linkedRev,
            verifiedCost,
            allocatedTransportCost: transport,
            allocatedLaborCost: labor,
            realizedProfitLoss: finalProfitLoss,
          },
        });
      }

      return await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
          status: updatedStatus,
          dispatchStatus: 'DELIVERED_AT_HUB',
          pendingAmount: remainingBalanceDue,
          paymentProofUrl: settlementProofUrl || po.paymentProofUrl,
          paymentProofNotes: utrNumber ? `Final Settlement UTR: ${utrNumber}` : po.paymentProofNotes,
          statusHistory: {
            create: {
              status: updatedStatus,
              changedById: req.user!.id,
              comment: isFullySettled
                ? `Final settlement of ₹${finalBalancePaid.toLocaleString('en-IN')} paid by ${hubName} (5% Admin Share: ₹${adminShareAmount.toLocaleString('en-IN')}, 1% APMC Cess: ₹${apmcShareAmount.toLocaleString('en-IN')}). Consignment Cleared ✓.`
                : `Partial payment of ₹${finalBalancePaid.toLocaleString('en-IN')} paid by ${hubName}. Remaining Due: ₹${remainingBalanceDue.toLocaleString('en-IN')} (Consignment remains OPEN).`,
            },
          },
        },
        include: {
          items: true,
          supplier: true,
          vendorProfile: true,
          financialRecord: true,
        },
      });
    });

    // Notify vendor
    const vendorUserId = po.vendorProfile?.user?.id;
    if (vendorUserId) {
      await prisma.notification.create({
        data: {
          userId: vendorUserId,
          recipientRole: 'VENDOR',
          type: 'INFO',
          title: isFullySettled ? `Consignment Closed & Cleared: ${po.poNumber}` : `Consignment Payment Received: ${po.poNumber}`,
          message: isFullySettled
            ? `Final balance of ₹${finalBalancePaid.toLocaleString('en-IN')} settled by ${hubName} (after 5% Admin Share & 1% APMC Cess). Consignment is Cleared ✓. Digital statement & settlement slip available.`
            : `Payment of ₹${finalBalancePaid.toLocaleString('en-IN')} received from ${hubName}. Remaining balance due: ₹${remainingBalanceDue.toLocaleString('en-IN')}. Consignment remains OPEN.`,
          linkUrl: '/dashboard',
        },
      }).catch(() => null);
    }

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: isFullySettled ? 'VENDOR_FINAL_SETTLEMENT_CLOSED' : 'VENDOR_PARTIAL_PAYMENT_RECORDED',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      details: `PO ${po.poNumber} settlement: ₹${finalBalancePaid.toLocaleString('en-IN')} paid, remaining: ₹${remainingBalanceDue.toLocaleString('en-IN')}, 5% Admin Share: ₹${adminShareAmount}, 1% APMC: ₹${apmcShareAmount}`,
      ipAddress: req.ip,
    });

    return res.json({
      message: isFullySettled
        ? `Consignment ${po.poNumber} settled and marked as CLEARED ✓! 5% Admin Share (₹${adminShareAmount.toLocaleString('en-IN')}) and 1% APMC Cess (₹${apmcShareAmount.toLocaleString('en-IN')}) realized.`
        : `Payment of ₹${finalBalancePaid.toLocaleString('en-IN')} recorded for ${po.poNumber}. Remaining Due: ₹${remainingBalanceDue.toLocaleString('en-IN')} (Consignment remains OPEN).`,
      purchaseOrder: enrichPOWithSettlementDetails(updated),
    });
  } catch (error: any) {
    console.error('settleVendorBalance error:', error);
    return res.status(500).json({ error: error.message || 'Failed to settle balance' });
  }
}

/**
 * POST /api/vendor/admin/po/:id/allot-vehicle
 * Admin allots vehicle number, transporter, driver, and approves the vendor consignment PO.
 * Moves status to 'APPROVED' and sets dispatchStatus to 'PENDING_DISPATCH' (ready for vendor loading).
 * Sends notification to the vendor so they can proceed with farm loading, taking photo, and signing.
 */
export async function allotVendorPOVehicle(req: AuthRequest, res: Response) {
  try {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'ACCOUNTANT')) {
      return res.status(403).json({ error: 'Admin or Accountant access required' });
    }

    const { id } = req.params;
    const { dispatchVehicleNumber, transporterName, driverPhone, allotmentNotes } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Purchase Order ID is required' });
    }

    if (!dispatchVehicleNumber || !dispatchVehicleNumber.trim()) {
      return res.status(400).json({ error: 'Vehicle Registration Number is mandatory' });
    }

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        vendorProfile: {
          include: { user: true },
        },
        supplier: true,
        createdBy: true,
        items: true,
      },
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    const vehiclePlate = dispatchVehicleNumber.trim().toUpperCase();
    const carrier = transporterName && transporterName.trim() ? transporterName.trim() : 'SAFAL Cold-Chain Express';
    const driver = driverPhone && driverPhone.trim() ? driverPhone.trim() : null;

    // Handle Transporter Bilty (LR) upload from Admin
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let transportBillUrl = req.body.transportBillUrl || req.body.biltyUrl;
    if (files && files['biltyFile'] && files['biltyFile'][0]) {
      transportBillUrl = `/uploads/${files['biltyFile'][0].filename}`;
    } else if (files && files['transportBill'] && files['transportBill'][0]) {
      transportBillUrl = `/uploads/${files['transportBill'][0].filename}`;
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        dispatchVehicleNumber: vehiclePlate,
        transporterName: carrier,
        driverPhone: driver,
        ...(transportBillUrl ? { transportBillUrl } : {}),
        status: 'APPROVED',
        dispatchStatus: 'PENDING_DISPATCH',
        approvedById: req.user.id,
        notes: allotmentNotes
          ? `${po.notes ? po.notes + ' | ' : ''}Vehicle Allotted: ${vehiclePlate} (${carrier}). Note: ${allotmentNotes}`
          : `${po.notes ? po.notes + ' | ' : ''}Vehicle Allotted: ${vehiclePlate} (${carrier})`,
        statusHistory: {
          create: {
            status: 'APPROVED',
            changedById: req.user.id,
            comment: `Refrigerated Vehicle ${vehiclePlate} (${carrier}) allotted by Admin (${req.user.name}) with Transporter Bilty. Order approved and truck dispatched to vendor farm loading origin.`,
          },
        },
      },
      include: {
        vendorProfile: true,
        supplier: true,
        items: true,
        financialRecord: true,
      },
    });

    // Notify Vendor User
    const targetUserId = po.vendorProfile?.userId || po.createdById || po.vendorProfile?.user?.id;
    if (targetUserId) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          recipientRole: 'VENDOR',
          type: 'SUCCESS',
          title: `🚚 Vehicle Allotted: Truck ${vehiclePlate}`,
          message: `Safal Admin approved PO ${po.poNumber} and allotted Vehicle ${vehiclePlate} (${carrier}). Vehicle is heading to your farm loading origin. Please confirm cartons loaded, take truck photo, and digitally sign the dispatch authorization.`,
          linkUrl: '/dashboard',
        },
      }).catch(() => null);
    }

    // Audit log
    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADMIN_ALLOTTED_VEHICLE',
      entityType: 'PURCHASE_ORDER',
      entityId: po.id,
      details: `Admin ${req.user.name} approved PO ${po.poNumber} and allotted truck ${vehiclePlate} (${carrier}) to vendor ${po.vendorProfile?.businessName || po.supplier?.name}`,
      ipAddress: req.ip,
    });

    return res.json({
      message: `Refrigerated Truck ${vehiclePlate} successfully allotted to PO ${po.poNumber}! Vendor has been notified to proceed with farm loading and dispatch signature.`,
      purchaseOrder: enrichPOWithSettlementDetails(updatedPO),
    });
  } catch (error: any) {
    console.error('allotVendorPOVehicle error:', error);
    return res.status(500).json({ error: error.message || 'Failed to allot vehicle and approve PO' });
  }
}
