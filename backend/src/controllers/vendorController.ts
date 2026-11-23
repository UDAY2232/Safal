import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import {
  VENDOR_WHITELISTED_LOCATIONS,
  isValidVendorLocation,
} from '../constants/vendorConstants.js';

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
        panNumber: profile.panNumber,
        bankAccountNumberMasked: maskBankAccount(profile.bankAccountNumber),
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
 * Allows vendor to edit profile ONLY IF isKycLocked === false.
 * If isKycLocked === true, strictly rejects any edits.
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

    if (profile.isKycLocked) {
      return res.status(403).json({
        error:
          'Profile & Bank details are permanently locked to guarantee financial compliance. Contact Safal Administrator to request modifications.',
      });
    }

    const {
      contactPerson,
      phone,
      bankAccountNumber,
      bankIfscCode,
      bankAccountHolder,
      bankName,
      bankBranch,
      aadharNumber,
      panNumber,
    } = req.body;

    const updated = await prisma.vendorProfile.update({
      where: { id: profile.id },
      data: {
        contactPerson: contactPerson || profile.contactPerson,
        phone: phone || profile.phone,
        bankAccountNumber: bankAccountNumber || profile.bankAccountNumber,
        bankIfscCode: bankIfscCode ? bankIfscCode.toUpperCase().trim() : profile.bankIfscCode,
        bankAccountHolder: bankAccountHolder || profile.bankAccountHolder,
        bankName: bankName || profile.bankName,
        bankBranch: bankBranch || profile.bankBranch,
        aadharNumber: aadharNumber || profile.aadharNumber,
        panNumber: panNumber ? panNumber.toUpperCase().trim() : profile.panNumber,
      },
    });

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
        supplier: {
          select: {
            name: true,
            supplierCode: true,
          },
        },
      },
      orderBy: { poDate: 'desc' },
    });

    return res.json(pos);
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
    let transportBillUrl = req.body.transportBillUrl;

    if (files && files['vehiclePhoto'] && files['vehiclePhoto'][0]) {
      vehiclePhotoUrl = `/uploads/${files['vehiclePhoto'][0].filename}`;
    }

    if (files && files['transportBill'] && files['transportBill'][0]) {
      transportBillUrl = `/uploads/${files['transportBill'][0].filename}`;
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
          'Transport Bill / Bilty (LR Copy) is required! Please upload the transport document.',
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
    });

    if (!po) {
      return res.status(404).json({ error: 'Purchase Order not found or not assigned to your account' });
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        dispatchVehicleNumber: dispatchVehicleNumber.trim().toUpperCase(),
        vehiclePhotoUrl,
        transportBillUrl,
        transporterName: transporterName || null,
        driverPhone: driverPhone || null,
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
    });

    const totalPOs = pos.length;
    const inTransitPOs = pos.filter(
      (p) => p.dispatchStatus === 'LOADED_AND_DISPATCHED' || p.dispatchStatus === 'IN_TRANSIT'
    ).length;
    const pendingDispatchPOs = pos.filter(
      (p) => p.dispatchStatus === 'PENDING_DISPATCH' && p.status !== 'CLOSED' && p.status !== 'CANCELLED'
    ).length;
    const deliveredPOs = pos.filter(
      (p) => p.dispatchStatus === 'DELIVERED_AT_HUB' || p.status === 'CLOSED'
    ).length;

    const totalOrderValue = pos.reduce((sum, p) => sum + Number(p.grandTotal || 0), 0);
    const totalAdvanceReceived = pos.reduce((sum, p) => sum + Number(p.advanceAmount || 0), 0);
    const totalPendingBalance = pos.reduce((sum, p) => {
      const adv = Number(p.advanceAmount || 0);
      return sum + Number(p.pendingAmount ?? Math.max(0, Number(p.grandTotal || 0) - adv));
    }, 0);

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

    // Validate location against 8 whitelisted hubs
    if (!isValidVendorLocation(primaryLocation)) {
      return res.status(400).json({
        error: `Invalid location "${primaryLocation}". Vendors can only be registered in one of the 8 allowed locations: ${VENDOR_WHITELISTED_LOCATIONS.join(
          ', '
        )}`,
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
      status,
      isKycLocked,
    } = req.body;

    if (primaryLocation && !isValidVendorLocation(primaryLocation)) {
      return res.status(400).json({
        error: `Invalid location "${primaryLocation}". Must be one of the 8 allowed locations: ${VENDOR_WHITELISTED_LOCATIONS.join(
          ', '
        )}`,
      });
    }

    const updated = await prisma.vendorProfile.update({
      where: { id },
      data: {
        businessName: businessName?.trim(),
        contactPerson: contactPerson?.trim(),
        phone: phone?.trim(),
        email: email?.trim(),
        primaryLocation: primaryLocation?.trim(),
        aadharNumber: aadharNumber?.trim(),
        panNumber: panNumber ? panNumber.trim().toUpperCase() : undefined,
        bankAccountNumber: bankAccountNumber?.trim(),
        bankIfscCode: bankIfscCode ? bankIfscCode.trim().toUpperCase() : undefined,
        bankAccountHolder: bankAccountHolder?.trim(),
        bankName: bankName?.trim(),
        bankBranch: bankBranch?.trim(),
        status: status || undefined,
        isKycLocked: typeof isKycLocked === 'boolean' ? isKycLocked : undefined,
      },
    });

    await createAuditLog({
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'ADMIN_UPDATE_VENDOR',
      entityType: 'VENDOR',
      entityId: id,
      details: `Admin ${req.user.name} updated vendor ${updated.vendorId} details`,
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
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'ACCOUNTANT')) {
      return res.status(403).json({ error: 'Admin or Accountant access required' });
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
          recipientId: po.vendorProfile.user.id,
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
