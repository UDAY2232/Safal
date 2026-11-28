import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import { notifyLiveSync } from '../services/liveSyncService.js';

// Helper to resolve current employee for logged-in user
async function getEmployeeForUser(userId: string) {
  return prisma.employee.findFirst({
    where: {
      OR: [
        { userId },
        { user: { id: userId } },
      ],
    },
  });
}

// ==========================================
// 1. AREA ALLOCATION & TERRITORY MANAGEMENT
// ==========================================

export async function getFieldAreas(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (!emp) {
        return res.json([]);
      }

      // Return only areas assigned to this employee
      const assignments = await prisma.fieldAreaAssignment.findMany({
        where: {
          employeeId: emp.id,
          isActive: true,
        },
        include: {
          area: {
            include: {
              sellers: {
                where: { registeredEmployeeId: emp.id },
              },
              visits: {
                where: { employeeId: emp.id },
              },
            },
          },
        },
      });

      const areas = assignments.map((a) => {
        const area = a.area;
        const sellers = area.sellers || [];
        const visits = area.visits || [];
        const purchasingSellers = sellers.filter((s) => s.purchaseCount > 0);
        const verifiedSellers = sellers.filter((s) => s.isVerified);
        const totalPurchaseVal = purchasingSellers.reduce(
          (sum, s) => sum + Number(s.totalPurchaseValue || 0),
          0
        );

        return {
          id: area.id,
          name: area.name,
          district: area.district,
          state: area.state,
          isActive: area.isActive,
          assignedDate: a.assignedAt,
          assignmentId: a.id,
          assignmentNotes: a.notes,
          metrics: {
            visitsCount: visits.length,
            sellersContacted: sellers.length,
            sellersRegistered: sellers.length,
            verifiedSellers: verifiedSellers.length,
            purchasingSellers: purchasingSellers.length,
            totalPurchaseValue: totalPurchaseVal,
          },
        };
      });

      return res.json(areas);
    }

    // Admin / Accountant: return all areas with employee assignments & global metrics
    const areas = await prisma.fieldArea.findMany({
      orderBy: { name: 'asc' },
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            employee: true,
          },
        },
        sellers: true,
        visits: true,
      },
    });

    const enriched = areas.map((area) => {
      const sellers = area.sellers || [];
      const visits = area.visits || [];
      const purchasingSellers = sellers.filter((s) => s.purchaseCount > 0);
      const verifiedSellers = sellers.filter((s) => s.isVerified);
      const totalPurchaseVal = purchasingSellers.reduce(
        (sum, s) => sum + Number(s.totalPurchaseValue || 0),
        0
      );

      return {
        id: area.id,
        name: area.name,
        district: area.district,
        state: area.state,
        isActive: area.isActive,
        assignedEmployees: area.assignments.map((a) => ({
          assignmentId: a.id,
          employeeId: a.employee.id,
          employeeName: a.employee.fullName,
          employeeCode: a.employee.employeeId,
          email: a.employee.email,
          assignedAt: a.assignedAt,
        })),
        metrics: {
          visitsCount: visits.length,
          sellersContacted: sellers.length,
          sellersRegistered: sellers.length,
          verifiedSellers: verifiedSellers.length,
          purchasingSellers: purchasingSellers.length,
          totalPurchaseValue: totalPurchaseVal,
        },
      };
    });

    return res.json(enriched);
  } catch (err: any) {
    console.error('Error in getFieldAreas:', err);
    return res.status(500).json({ error: 'Failed to fetch field areas' });
  }
}

export async function createFieldArea(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const { name, district, state = 'Telangana' } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Area name is required' });
    }

    const cleanName = name.trim();
    const existing = await prisma.fieldArea.findUnique({ where: { name: cleanName } });
    if (existing) {
      return res.status(400).json({ error: `Area '${cleanName}' already exists` });
    }

    const area = await prisma.fieldArea.create({
      data: {
        name: cleanName,
        district: district ? String(district).trim() : null,
        state: String(state).trim(),
        isActive: true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'FIELD_AREA_CREATED',
      entityType: 'FIELD_WORK',
      entityId: area.id,
      details: `Created new Field Work area: ${area.name} (${area.district || 'Telangana'})`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'FIELD_AREA_UPDATED' });
    return res.status(201).json(area);
  } catch (err: any) {
    console.error('Error creating field area:', err);
    return res.status(500).json({ error: err.message || 'Failed to create field area' });
  }
}

export async function assignAreaToEmployee(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const { employeeId, areaId, notes } = req.body;
    if (!employeeId || !areaId) {
      return res.status(400).json({ error: 'employeeId and areaId are required' });
    }

    const [emp, area] = await Promise.all([
      prisma.employee.findUnique({ where: { id: employeeId } }),
      prisma.fieldArea.findUnique({ where: { id: areaId } }),
    ]);

    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    if (!area) return res.status(404).json({ error: 'Area not found' });

    const assignment = await prisma.fieldAreaAssignment.upsert({
      where: {
        employeeId_areaId: {
          employeeId,
          areaId,
        },
      },
      update: {
        isActive: true,
        notes: notes ? String(notes).trim() : undefined,
        assignedById: req.user?.id,
        assignedAt: new Date(),
      },
      create: {
        employeeId,
        areaId,
        notes: notes ? String(notes).trim() : undefined,
        assignedById: req.user?.id,
        isActive: true,
      },
      include: {
        area: true,
        employee: true,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'FIELD_AREA_ASSIGNED',
      entityType: 'FIELD_WORK',
      entityId: assignment.id,
      details: `Assigned area ${area.name} to employee ${emp.fullName}`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'FIELD_AREA_UPDATED' });
    return res.json(assignment);
  } catch (err: any) {
    console.error('Error assigning field area:', err);
    return res.status(500).json({ error: err.message || 'Failed to assign area' });
  }
}

export async function removeAreaAssignment(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin authorization required' });
    }

    const { id } = req.params;
    const assignment = await prisma.fieldAreaAssignment.findUnique({
      where: { id },
      include: { area: true, employee: true },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.fieldAreaAssignment.delete({ where: { id } });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'FIELD_AREA_UNASSIGNED',
      entityType: 'FIELD_WORK',
      entityId: id,
      details: `Removed area ${assignment.area.name} assignment from ${assignment.employee.fullName}`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'FIELD_AREA_UPDATED' });
    return res.json({ message: 'Assignment removed successfully' });
  } catch (err: any) {
    console.error('Error removing assignment:', err);
    return res.status(500).json({ error: 'Failed to remove area assignment' });
  }
}

// ==========================================
// 2. LOCAL SELLERS & LEADS REGISTRATION
// ==========================================

export async function getFieldSellers(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { areaId, stage, search } = req.query;

    const where: any = {};

    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (!emp) return res.json([]);

      // Employee can see sellers registered by them or within their assigned areas
      const myAreas = await prisma.fieldAreaAssignment.findMany({
        where: { employeeId: emp.id, isActive: true },
        select: { areaId: true },
      });
      const areaIds = myAreas.map((a) => a.areaId);

      where.OR = [
        { registeredEmployeeId: emp.id },
        { areaId: { in: areaIds } },
      ];
    }

    if (areaId && typeof areaId === 'string' && areaId !== 'ALL') {
      where.areaId = areaId;
    }

    if (stage && typeof stage === 'string' && stage !== 'ALL') {
      where.stage = stage;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { shopName: { contains: q, mode: 'insensitive' } },
            { ownerName: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q } },
            { sellerCode: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const sellers = await prisma.fieldSeller.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        area: true,
        registeredEmployee: {
          select: { id: true, fullName: true, employeeId: true, email: true },
        },
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 3,
        },
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const formattedSellers = sellers.map((s) => ({
      ...s,
      mobileNumber: s.mobile,
      whatsappNumber: s.whatsapp,
      shopAddress: s.address,
      conversionStage: s.stage,
      registeredBy: s.registeredEmployee
        ? {
            id: s.registeredEmployee.id,
            name: s.registeredEmployee.fullName,
            fullName: s.registeredEmployee.fullName,
            employeeCode: s.registeredEmployee.employeeId,
          }
        : null,
      ordersCount: s.purchaseCount,
      totalPurchaseAmount: Number(s.totalPurchaseValue || 0),
    }));

    return res.json(formattedSellers);
  } catch (err: any) {
    console.error('Error fetching field sellers:', err);
    return res.status(500).json({ error: 'Failed to fetch sellers' });
  }
}

export async function createFieldSeller(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const {
      shopName,
      ownerName,
      mobile,
      whatsapp,
      address,
      areaId,
      businessType = 'RETAILER',
      fruitsInterested = [],
      estMonthlyQtyKg,
      estMonthlyValue,
      interestLevel = 'WARM',
      notes,
    } = req.body;

    const rawMobile = mobile || req.body.mobileNumber;
    const rawOwner = ownerName || req.body.ownerName;
    const rawWa = whatsapp || req.body.whatsappNumber;
    const rawAddress = address || req.body.shopAddress;
    const rawQty = estMonthlyQtyKg ?? req.body.estimatedMonthlyQty;
    const rawVal = estMonthlyValue ?? req.body.estimatedMonthlyValue;

    // Validation
    if (!shopName?.trim()) return res.status(400).json({ error: 'Shop name is required' });
    if (!rawMobile?.trim()) return res.status(400).json({ error: 'Mobile number is required' });
    if (!areaId) return res.status(400).json({ error: 'Assigned Area is required' });

    const cleanMobile = rawMobile.trim().replace(/\D/g, '').slice(-10);
    if (cleanMobile.length < 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit mobile number' });
    }

    // Duplicate check
    const existingSeller = await prisma.fieldSeller.findFirst({
      where: {
        mobile: { contains: cleanMobile },
      },
      include: {
        registeredEmployee: true,
        area: true,
      },
    });

    if (existingSeller) {
      return res.status(400).json({
        error: `Seller with mobile ${cleanMobile} already registered: '${existingSeller.shopName}' in ${existingSeller.area?.name || 'area'} by ${existingSeller.registeredEmployee?.fullName || 'Staff'}.`,
        isDuplicate: true,
        existingSeller,
      });
    }

    // Role check: If EMPLOYEE, verify area is assigned to them
    let targetEmployeeId = '';
    if (userRole === 'EMPLOYEE') {
      const emp = await getEmployeeForUser(userId);
      if (!emp) return res.status(400).json({ error: 'Employee profile not found' });
      targetEmployeeId = emp.id;

      // Verify area is assigned to this employee
      const assigned = await prisma.fieldAreaAssignment.findFirst({
        where: {
          employeeId: emp.id,
          areaId,
          isActive: true,
        },
      });

      if (!assigned) {
        return res.status(403).json({
          error: 'You are only authorized to register sellers inside your allocated territories.',
        });
      }
    } else {
      // Admin registering: allow assigning to selected employee or admin's choice
      targetEmployeeId = req.body.registeredEmployeeId;
      if (!targetEmployeeId) {
        const firstEmp = await prisma.employee.findFirst();
        targetEmployeeId = firstEmp?.id || '';
      }
    }

    // Generate Seller Code
    const count = await prisma.fieldSeller.count();
    const sellerCode = `FSL-${String(count + 1).padStart(3, '0')}`;

    const newSeller = await prisma.fieldSeller.create({
      data: {
        sellerCode,
        shopName: shopName.trim(),
        ownerName: (rawOwner || 'Owner').trim(),
        mobile: cleanMobile,
        whatsapp: rawWa ? rawWa.trim().replace(/\D/g, '').slice(-10) : cleanMobile,
        address: rawAddress ? rawAddress.trim() : 'Local Market',
        areaId,
        businessType: String(businessType).toUpperCase(),
        fruitsInterested: JSON.stringify(Array.isArray(fruitsInterested) ? fruitsInterested : [fruitsInterested]),
        estMonthlyQtyKg: rawQty ? Number(rawQty) : null,
        estMonthlyValue: rawVal ? Number(rawVal) : null,
        interestLevel: String(interestLevel).toUpperCase(),
        stage: 'REGISTERED',
        registeredEmployeeId: targetEmployeeId,
        isVerified: userRole === 'ADMIN',
        verifiedById: userRole === 'ADMIN' ? userId : null,
        verifiedAt: userRole === 'ADMIN' ? new Date() : null,
        notes: notes ? notes.trim() : null,
      },
      include: {
        area: true,
        registeredEmployee: true,
      },
    });

    // If Admin registered, award 10 points immediately; if Employee registered, points are awarded on Admin verification
    if (userRole === 'ADMIN') {
      const config = await prisma.fieldScoringConfig.findFirst();
      const points = config?.newSellerRegPoints || 10;
      const currentMonth = new Date().toISOString().slice(0, 7);

      await prisma.fieldPerformancePoint.create({
        data: {
          employeeId: targetEmployeeId,
          points,
          actionType: 'NEW_SELLER_REG',
          referenceId: newSeller.id,
          reason: `Verified registration of seller: ${newSeller.shopName} (${newSeller.sellerCode})`,
          monthYear: currentMonth,
          awardedById: userId,
        },
      });
    }

    await createAuditLog({
      userId,
      userName: req.user?.name || 'Staff',
      userRole: userRole || 'EMPLOYEE',
      action: 'FIELD_SELLER_REGISTERED',
      entityType: 'FIELD_WORK',
      entityId: newSeller.id,
      details: `Registered new fruit seller ${newSeller.shopName} (${newSeller.sellerCode}) in ${newSeller.area.name}`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'FIELD_SELLER_REGISTERED', entityId: newSeller.id });
    return res.status(201).json(newSeller);
  } catch (err: any) {
    console.error('Error creating field seller:', err);
    return res.status(500).json({ error: err.message || 'Failed to register seller' });
  }
}

export async function verifyFieldSeller(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin authorization required to verify sellers' });
    }

    const { id } = req.params;
    const seller = await prisma.fieldSeller.findUnique({
      where: { id },
      include: { registeredEmployee: true },
    });

    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    if (seller.isVerified) {
      return res.json({ message: 'Seller is already verified', seller });
    }

    const updated = await prisma.fieldSeller.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedById: req.user?.id,
        verifiedAt: new Date(),
        stage: seller.stage === 'LEAD_IDENTIFIED' ? 'REGISTERED' : seller.stage,
      },
    });

    // Award 10 points to registering employee
    const config = await prisma.fieldScoringConfig.findFirst();
    const pts = config?.newSellerRegPoints || 10;
    const currentMonth = new Date().toISOString().slice(0, 7);

    await prisma.fieldPerformancePoint.create({
      data: {
        employeeId: seller.registeredEmployeeId,
        points: pts,
        actionType: 'NEW_SELLER_REG',
        referenceId: seller.id,
        reason: `Verified registration of seller: ${seller.shopName} (${seller.sellerCode})`,
        monthYear: currentMonth,
        awardedById: req.user?.id,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'FIELD_SELLER_VERIFIED',
      entityType: 'FIELD_WORK',
      entityId: id,
      details: `Admin verified seller ${seller.shopName}. Awarded ${pts} pts to ${seller.registeredEmployee.fullName}`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'FIELD_SELLER_VERIFIED', entityId: id });
    return res.json(updated);
  } catch (err: any) {
    console.error('Error verifying field seller:', err);
    return res.status(500).json({ error: 'Failed to verify seller' });
  }
}

// ==========================================
// 3. RECORD FIELD VISITS
// ==========================================

export async function getFieldVisits(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { sellerId, employeeId } = req.query;

    const where: any = {};
    if (sellerId && typeof sellerId === 'string') {
      where.sellerId = sellerId;
    }

    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (!emp) return res.json([]);
      where.employeeId = emp.id;
    } else if (employeeId && typeof employeeId === 'string') {
      where.employeeId = employeeId;
    }

    const visits = await prisma.fieldVisit.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      include: {
        seller: true,
        employee: {
          select: { id: true, fullName: true, employeeId: true },
        },
        area: true,
      },
    });

    return res.json(visits);
  } catch (err: any) {
    console.error('Error fetching field visits:', err);
    return res.status(500).json({ error: 'Failed to fetch field visits' });
  }
}

export async function createFieldVisit(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const emp = await getEmployeeForUser(userId);
    if (!emp && req.user?.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Employee profile not found' });
    }

    const targetEmployeeId = emp ? emp.id : req.body.employeeId;
    const {
      sellerId,
      visitDate,
      purpose,
      visitPurpose,
      discussionSummary,
      fruitsDiscussed,
      customerRequirements,
      feedbackText,
      sellerFeedback,
      nextFollowUpDate,
      status = 'INTERESTED',
      visitStatus,
    } = req.body;

    const finalPurpose = (purpose || visitPurpose || 'Product Demonstration & Discussion').trim();
    const finalDiscussion = (discussionSummary || 'Discussion completed with shop owner').trim();
    const finalStatus = String(visitStatus || status || 'INTERESTED').toUpperCase();
    const finalFeedback = (feedbackText || sellerFeedback || '').trim() || null;

    if (!finalPurpose) return res.status(400).json({ error: 'Visit purpose is required' });
    if (!finalDiscussion) {
      return res.status(400).json({ error: 'Discussion summary is required' });
    }

    // Photo is strictly mandatory
    const uploadedFile = (req.files && Array.isArray(req.files) && req.files.length > 0)
      ? req.files[0]
      : req.file;

    const photoUrl = uploadedFile ? `/uploads/${uploadedFile.filename}` : req.body.photoUrl;

    if (!photoUrl) {
      return res.status(400).json({
        error: 'Shop / Visit photo is strictly mandatory. Please capture or upload a photo of the shop visit.',
      });
    }

    // Resolve seller: either selected from dropdown or manually entered
    let targetSellerId = sellerId;

    if (!targetSellerId) {
      const manualShopName = req.body.manualShopName || req.body.shopName;
      const manualOwner = req.body.manualOwner || req.body.ownerName;
      const manualMobile = req.body.manualMobile || req.body.mobileNumber;
      const manualAreaId = req.body.manualAreaId || req.body.areaId;

      if (!manualShopName?.trim()) {
        return res.status(400).json({ error: 'Please choose an existing seller or enter shop name manually.' });
      }

      let cleanMob = manualMobile ? manualMobile.trim().replace(/\D/g, '').slice(-10) : '';
      let existing = null;
      if (cleanMob && cleanMob.length >= 10) {
        existing = await prisma.fieldSeller.findFirst({
          where: { mobile: cleanMob },
        });
      }

      if (existing) {
        targetSellerId = existing.id;
      } else {
        // Resolve area
        let resolvedAreaId = manualAreaId;
        if (!resolvedAreaId) {
          const firstAss = await prisma.fieldAreaAssignment.findFirst({
            where: { employeeId: targetEmployeeId, isActive: true },
          });
          resolvedAreaId = firstAss?.areaId;
        }

        if (!resolvedAreaId) {
          const firstArea = await prisma.fieldArea.findFirst();
          resolvedAreaId = firstArea?.id;
        }

        const count = await prisma.fieldSeller.count();
        const sellerCode = `FSL-${String(count + 1).padStart(3, '0')}`;

        const createdSeller = await prisma.fieldSeller.create({
          data: {
            sellerCode,
            shopName: manualShopName.trim(),
            ownerName: manualOwner ? manualOwner.trim() : 'Owner',
            mobile: cleanMob || `TEMP-${Date.now().toString().slice(-8)}`,
            whatsapp: cleanMob || null,
            address: req.body.manualAddress || req.body.address || 'Local Market Area',
            areaId: resolvedAreaId!,
            businessType: req.body.businessType || 'RETAILER',
            stage: 'INTERESTED',
            registeredEmployeeId: targetEmployeeId,
            isVerified: false,
          },
        });
        targetSellerId = createdSeller.id;
      }
    }

    const seller = await prisma.fieldSeller.findUnique({
      where: { id: targetSellerId },
    });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    // Check if this is the employee's FIRST visit to this seller (unique visit check)
    const prevVisits = await prisma.fieldVisit.count({
      where: {
        sellerId: targetSellerId,
        employeeId: targetEmployeeId,
      },
    });

    const isFirstUniqueVisit = prevVisits === 0;
    const config = await prisma.fieldScoringConfig.findFirst();
    const visitPoints = isFirstUniqueVisit ? config?.uniqueVisitPoints || 5 : 0;

    const visit = await prisma.fieldVisit.create({
      data: {
        sellerId: targetSellerId,
        employeeId: targetEmployeeId,
        areaId: seller.areaId,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        purpose: finalPurpose,
        discussionSummary: finalDiscussion,
        fruitsDiscussed: fruitsDiscussed ? String(fruitsDiscussed).trim() : null,
        customerRequirements: customerRequirements ? String(customerRequirements).trim() : null,
        feedbackText: finalFeedback,
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        status: finalStatus,
        photoUrl,
        isVerified: true,
        pointsAwarded: visitPoints,
      },
      include: {
        seller: true,
        employee: true,
        area: true,
      },
    });

    // Update seller stage based on visit outcome
    let nextStage = seller.stage;
    if (status === 'CONVERTED') {
      nextStage = seller.purchaseCount > 0 ? 'REPEAT_CUSTOMER' : 'FIRST_PURCHASE';
    } else if (status === 'INTERESTED' && seller.stage === 'LEAD_IDENTIFIED') {
      nextStage = 'INTERESTED';
    } else if (status === 'FOLLOW_UP_REQUIRED') {
      nextStage = 'FOLLOW_UP';
    }

    await prisma.fieldSeller.update({
      where: { id: targetSellerId },
      data: {
        stage: nextStage,
        interestLevel: status === 'NOT_INTERESTED' ? 'COLD' : seller.interestLevel,
      },
    });

    // Award unique visit points if applicable
    if (visitPoints > 0) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await prisma.fieldPerformancePoint.create({
        data: {
          employeeId: targetEmployeeId,
          points: visitPoints,
          actionType: 'UNIQUE_VISIT',
          referenceId: visit.id,
          reason: `Approved unique field visit to: ${seller.shopName}`,
          monthYear: currentMonth,
          awardedById: req.user?.id,
        },
      });
    }

    await createAuditLog({
      userId,
      userName: req.user?.name || 'Staff',
      userRole: req.user?.role || 'EMPLOYEE',
      action: 'FIELD_VISIT_RECORDED',
      entityType: 'FIELD_WORK',
      entityId: visit.id,
      details: `Recorded visit to ${seller.shopName} (${seller.sellerCode}) by ${emp?.fullName || 'Staff'}`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'FIELD_VISIT_RECORDED', entityId: visit.id });
    return res.status(201).json(visit);
  } catch (err: any) {
    console.error('Error recording field visit:', err);
    return res.status(500).json({ error: err.message || 'Failed to record field visit' });
  }
}

// ==========================================
// 4. DAILY FIELD WORK REPORTS
// ==========================================

export async function getDailyFieldReports(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { employeeId, status, date } = req.query;

    const where: any = {};
    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (!emp) return res.json([]);
      where.employeeId = emp.id;
    } else if (employeeId && typeof employeeId === 'string' && employeeId !== 'ALL') {
      where.employeeId = employeeId;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      where.status = status;
    }

    if (date && typeof date === 'string') {
      where.reportDate = new Date(date);
    }

    const reports = await prisma.dailyFieldReport.findMany({
      where,
      orderBy: { reportDate: 'desc' },
      include: {
        employee: {
          select: { id: true, fullName: true, employeeId: true, email: true },
        },
        area: true,
      },
    });

    const formattedReports = reports.map((r) => ({
      ...r,
      shopsVisitedCount: r.shopsVisited,
      sellersContactedCount: r.newSellersContacted,
      sellersRegisteredCount: r.sellersRegistered,
      interestedSellersCount: r.interestedSellers,
      followUpsCompletedCount: r.followUpsCompleted,
      conversionsCount: r.purchaseConversions,
      status: r.status === 'PENDING_APPROVAL' ? 'PENDING' : r.status,
    }));

    return res.json(formattedReports);
  } catch (err: any) {
    console.error('Error fetching daily reports:', err);
    return res.status(500).json({ error: 'Failed to fetch daily field reports' });
  }
}

export async function submitDailyFieldReport(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const emp = await getEmployeeForUser(userId);
    if (!emp && req.user?.role !== 'ADMIN') {
      return res.status(400).json({ error: 'Employee record not found' });
    }

    const targetEmployeeId = emp ? emp.id : req.body.employeeId;
    const {
      reportDate,
      areaId,
      shopsVisited = 0,
      newSellersContacted = 0,
      sellersRegistered = 0,
      interestedSellers = 0,
      followUpsCompleted = 0,
      purchaseConversions = 0,
      majorAchievements,
      problemsFaced,
      tomorrowPlan,
    } = req.body;

    if (!areaId) return res.status(400).json({ error: 'Area is required' });

    const cleanDate = reportDate ? new Date(reportDate) : new Date();

    const shops = req.body.shopsVisited ?? req.body.shopsVisitedCount ?? 0;
    const contacted = req.body.newSellersContacted ?? req.body.sellersContactedCount ?? 0;
    const registered = req.body.sellersRegistered ?? req.body.sellersRegisteredCount ?? 0;
    const interested = req.body.interestedSellers ?? req.body.interestedSellersCount ?? 0;
    const followups = req.body.followUpsCompleted ?? req.body.followUpsCompletedCount ?? 0;
    const conversions = req.body.purchaseConversions ?? req.body.conversionsCount ?? 0;

    const report = await prisma.dailyFieldReport.upsert({
      where: {
        employeeId_reportDate_areaId: {
          employeeId: targetEmployeeId,
          reportDate: cleanDate,
          areaId,
        },
      },
      update: {
        shopsVisited: Number(shops) || 0,
        newSellersContacted: Number(contacted) || 0,
        sellersRegistered: Number(registered) || 0,
        interestedSellers: Number(interested) || 0,
        followUpsCompleted: Number(followups) || 0,
        purchaseConversions: Number(conversions) || 0,
        majorAchievements: majorAchievements ? String(majorAchievements).trim() : null,
        problemsFaced: problemsFaced ? String(problemsFaced).trim() : null,
        tomorrowPlan: tomorrowPlan ? String(tomorrowPlan).trim() : null,
        status: 'PENDING_APPROVAL',
      },
      create: {
        employeeId: targetEmployeeId,
        reportDate: cleanDate,
        areaId,
        shopsVisited: Number(shops) || 0,
        newSellersContacted: Number(contacted) || 0,
        sellersRegistered: Number(registered) || 0,
        interestedSellers: Number(interested) || 0,
        followUpsCompleted: Number(followups) || 0,
        purchaseConversions: Number(conversions) || 0,
        majorAchievements: majorAchievements ? String(majorAchievements).trim() : null,
        problemsFaced: problemsFaced ? String(problemsFaced).trim() : null,
        tomorrowPlan: tomorrowPlan ? String(tomorrowPlan).trim() : null,
        status: 'PENDING_APPROVAL',
      },
      include: {
        employee: true,
        area: true,
      },
    });

    await createAuditLog({
      userId,
      userName: req.user?.name || 'Staff',
      userRole: req.user?.role || 'EMPLOYEE',
      action: 'DAILY_REPORT_SUBMITTED',
      entityType: 'FIELD_WORK',
      entityId: report.id,
      details: `Submitted daily field report for ${report.area.name} on ${cleanDate.toLocaleDateString('en-GB')}`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'DAILY_FIELD_REPORT_SUBMITTED', entityId: report.id });
    return res.status(201).json(report);
  } catch (err: any) {
    console.error('Error submitting daily field report:', err);
    return res.status(500).json({ error: err.message || 'Failed to submit report' });
  }
}

export async function reviewDailyFieldReport(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin approval required' });
    }

    const { id } = req.params;
    const { status, reviewComments } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: "Status must be 'APPROVED' or 'REJECTED'" });
    }

    const report = await prisma.dailyFieldReport.findUnique({
      where: { id },
      include: { employee: true, area: true },
    });

    if (!report) return res.status(404).json({ error: 'Report not found' });

    const config = await prisma.fieldScoringConfig.findFirst();
    const points = status === 'APPROVED' ? config?.dailyReportPoints || 5 : 0;

    const updated = await prisma.dailyFieldReport.update({
      where: { id },
      data: {
        status,
        reviewedById: req.user?.id,
        reviewedAt: new Date(),
        reviewComments: reviewComments ? String(reviewComments).trim() : null,
        pointsAwarded: points,
      },
    });

    // If approved, award points
    if (status === 'APPROVED' && points > 0) {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await prisma.fieldPerformancePoint.create({
        data: {
          employeeId: report.employeeId,
          points,
          actionType: 'DAILY_REPORT',
          referenceId: report.id,
          reason: `Approved Daily Field Work Report for ${report.area.name} (${new Date(report.reportDate).toLocaleDateString('en-GB')})`,
          monthYear: currentMonth,
          awardedById: req.user?.id,
        },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: status === 'APPROVED' ? 'DAILY_REPORT_APPROVED' : 'DAILY_REPORT_REJECTED',
      entityType: 'FIELD_WORK',
      entityId: id,
      details: `${status} daily field report of ${report.employee.fullName} for ${report.area.name} with ${points} pts awarded`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'DAILY_FIELD_REPORT_REVIEWED', entityId: id });
    return res.json(updated);
  } catch (err: any) {
    console.error('Error reviewing daily field report:', err);
    return res.status(500).json({ error: 'Failed to review daily report' });
  }
}

// ==========================================
// 5. SELLER CONVERSION & REAL PURCHASE LINKING
// ==========================================

export async function linkPurchaseConversion(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin permission required to verify and link purchases' });
    }

    const { sellerId, orderId, purchaseAmount } = req.body;
    if (!sellerId) return res.status(400).json({ error: 'sellerId is required' });

    const seller = await prisma.fieldSeller.findUnique({
      where: { id: sellerId },
      include: { registeredEmployee: true },
    });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    let verifiedAmount = Number(purchaseAmount) || 0;

    // Link real PurchaseOrder/CustomerDue if orderId is provided
    if (orderId) {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: orderId },
      });
      if (po) {
        verifiedAmount = Number(po.grandTotal || po.subtotal || 0);
      }
    }

    if (verifiedAmount <= 0) {
      return res.status(400).json({
        error: 'A verified purchase transaction with positive amount is required to record conversion',
      });
    }

    const isFirstTime = seller.purchaseCount === 0;
    const config = await prisma.fieldScoringConfig.findFirst();
    const pointsToAward = isFirstTime
      ? config?.firstPurchasePoints || 50
      : config?.repeatPurchasePoints || 20;

    const newPurchaseCount = seller.purchaseCount + 1;
    const newTotalPurchaseVal = Number(seller.totalPurchaseValue || 0) + verifiedAmount;
    const newStage = isFirstTime ? 'FIRST_PURCHASE' : 'REPEAT_CUSTOMER';

    const updatedSeller = await prisma.fieldSeller.update({
      where: { id: sellerId },
      data: {
        stage: newStage,
        purchaseCount: newPurchaseCount,
        totalPurchaseValue: newTotalPurchaseVal,
        firstPurchaseDate: isFirstTime ? new Date() : seller.firstPurchaseDate,
        firstPurchaseAmount: isFirstTime ? verifiedAmount : seller.firstPurchaseAmount,
        lastPurchaseDate: new Date(),
        isVerified: true,
      },
    });

    // Award Points to the Employee who converted the seller
    const currentMonth = new Date().toISOString().slice(0, 7);
    await prisma.fieldPerformancePoint.create({
      data: {
        employeeId: seller.registeredEmployeeId,
        points: pointsToAward,
        actionType: isFirstTime ? 'FIRST_PURCHASE' : 'REPEAT_PURCHASE',
        referenceId: seller.id,
        reason: `${isFirstTime ? 'First-time purchasing conversion' : 'Repeat customer conversion'}: ${seller.shopName} (₹${verifiedAmount.toLocaleString('en-IN')})`,
        monthYear: currentMonth,
        awardedById: req.user?.id,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'FIELD_SELLER_CONVERSION_VERIFIED',
      entityType: 'FIELD_WORK',
      entityId: sellerId,
      details: `Verified purchase conversion of ${seller.shopName} (₹${verifiedAmount.toLocaleString('en-IN')}). Awarded ${pointsToAward} pts to ${seller.registeredEmployee.fullName}`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'FIELD_SELLER_CONVERTED', entityId: sellerId });
    return res.json({
      ...updatedSeller,
      pointsAwarded: pointsToAward,
      conversionStage: newStage,
    });
  } catch (err: any) {
    console.error('Error linking purchase conversion:', err);
    return res.status(500).json({ error: err.message || 'Failed to record purchase conversion' });
  }
}

// ==========================================
// 6. PERFORMANCE, POINTS & LEADERBOARD
// ==========================================

export async function getPointsAndLeaderboard(req: AuthRequest, res: Response) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const dateObj = new Date();
    dateObj.setMonth(dateObj.getMonth() - 1);
    const prevMonth = dateObj.toISOString().slice(0, 7);

    // Fetch all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        performancePoints: true,
        registeredSellers: true,
        fieldAreaAssignments: {
          where: { isActive: true },
          include: { area: true },
        },
      },
    });

    const leaderboard = employees.map((emp) => {
      const allPoints = emp.performancePoints || [];
      const currentMonthPoints = allPoints
        .filter((p) => p.monthYear === currentMonth)
        .reduce((sum, p) => sum + p.points, 0);

      const prevMonthPoints = allPoints
        .filter((p) => p.monthYear === prevMonth)
        .reduce((sum, p) => sum + p.points, 0);

      const totalAllTimePoints = allPoints.reduce((sum, p) => sum + p.points, 0);

      const sellers = emp.registeredSellers || [];
      const convertedSellers = sellers.filter((s) => s.purchaseCount > 0);
      const totalPurchaseVal = convertedSellers.reduce(
        (sum, s) => sum + Number(s.totalPurchaseValue || 0),
        0
      );

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        fullName: emp.fullName,
        email: emp.email,
        assignedAreas: emp.fieldAreaAssignments.map((a) => a.area.name),
        currentMonthPoints,
        prevMonthPoints,
        totalAllTimePoints,
        sellersRegistered: sellers.length,
        sellersConverted: convertedSellers.length,
        totalPurchaseValueGenerated: totalPurchaseVal,
      };
    });

    // Sort descending by current month points
    leaderboard.sort((a, b) => b.currentMonthPoints - a.currentMonthPoints);

    // Assign rank
    const rankedLeaderboard = leaderboard.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    return res.json({
      currentMonth,
      prevMonth,
      leaderboard: rankedLeaderboard,
    });
  } catch (err: any) {
    console.error('Error fetching points leaderboard:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

export async function getMyPerformancePoints(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const emp = await getEmployeeForUser(userId);
    if (!emp) return res.json({ points: [], currentMonthPoints: 0, prevMonthPoints: 0 });

    const currentMonth = new Date().toISOString().slice(0, 7);
    const dateObj = new Date();
    dateObj.setMonth(dateObj.getMonth() - 1);
    const prevMonth = dateObj.toISOString().slice(0, 7);

    const points = await prisma.fieldPerformancePoint.findMany({
      where: { employeeId: emp.id },
      orderBy: { createdAt: 'desc' },
    });

    const currentMonthPoints = points
      .filter((p) => p.monthYear === currentMonth)
      .reduce((sum, p) => sum + p.points, 0);

    const prevMonthPoints = points
      .filter((p) => p.monthYear === prevMonth)
      .reduce((sum, p) => sum + p.points, 0);

    // Target for current month
    const target = await prisma.employeeMonthlyTarget.findUnique({
      where: {
        employeeId_monthYear: {
          employeeId: emp.id,
          monthYear: currentMonth,
        },
      },
    });

    return res.json({
      employeeId: emp.id,
      employeeName: emp.fullName,
      currentMonth,
      currentMonthPoints,
      prevMonthPoints,
      totalPoints: currentMonthPoints,
      targetPoints: target?.targetPoints || 500,
      pointsHistory: points,
      history: points,
    });
  } catch (err: any) {
    console.error('Error fetching my performance points:', err);
    return res.status(500).json({ error: 'Failed to fetch points' });
  }
}

export async function adjustPointsManually(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin permission required to adjust points' });
    }

    const { employeeId, points, reason, monthYear } = req.body;
    if (!employeeId || typeof points !== 'number') {
      return res.status(400).json({ error: 'employeeId and numeric points are required' });
    }
    if (!reason?.trim()) {
      return res.status(400).json({ error: 'Audit reason is mandatory for manual point adjustments' });
    }

    const emp = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    const currentMonth = monthYear || new Date().toISOString().slice(0, 7);

    const adjustment = await prisma.fieldPerformancePoint.create({
      data: {
        employeeId,
        points,
        actionType: 'MANUAL_ADJUSTMENT',
        reason: reason.trim(),
        monthYear: currentMonth,
        awardedById: req.user?.id,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'MANUAL_POINT_ADJUSTMENT',
      entityType: 'FIELD_WORK',
      entityId: adjustment.id,
      details: `Admin adjusted ${points} pts for ${emp.fullName}. Reason: ${reason.trim()}`,
      ipAddress: req.ip,
    });

    notifyLiveSync({ type: 'FIELD_POINTS_UPDATED', entityId: employeeId });
    return res.json(adjustment);
  } catch (err: any) {
    console.error('Error adjusting points:', err);
    return res.status(500).json({ error: 'Failed to adjust points' });
  }
}

// ==========================================
// 7. DASHBOARD METRICS & KPI AGGREGATIONS
// ==========================================

export async function getEmployeeFieldDashboard(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const emp = await getEmployeeForUser(userId);
    if (!emp) {
      return res.status(404).json({ error: 'Employee profile not found' });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    // 1. Assigned Areas
    const assignments = await prisma.fieldAreaAssignment.findMany({
      where: { employeeId: emp.id, isActive: true },
      include: { area: true },
    });
    const totalAssignedAreas = assignments.length;
    const areaIds = assignments.map((a) => a.areaId);

    // 2. Visits & Unique Areas Visited
    const visits = await prisma.fieldVisit.findMany({
      where: { employeeId: emp.id },
      include: { seller: true, area: true },
      orderBy: { visitDate: 'desc' },
    });
    const uniqueAreasVisited = new Set(visits.map((v) => v.areaId)).size;

    // 3. Sellers
    const sellers = await prisma.fieldSeller.findMany({
      where: { registeredEmployeeId: emp.id },
      include: { area: true },
    });

    const totalSellersContacted = sellers.length;
    const verifiedSellers = sellers.filter((s) => s.isVerified).length;
    const firstTimePurchasers = sellers.filter((s) => s.purchaseCount === 1).length;
    const repeatPurchasers = sellers.filter((s) => s.purchaseCount > 1).length;
    const totalVerifiedPurchaseValue = sellers.reduce(
      (sum, s) => sum + Number(s.totalPurchaseValue || 0),
      0
    );

    // 4. Points
    const points = await prisma.fieldPerformancePoint.findMany({
      where: { employeeId: emp.id },
    });
    const monthlyPoints = points
      .filter((p) => p.monthYear === currentMonth)
      .reduce((sum, p) => sum + p.points, 0);

    // 5. Follow-ups pending
    const upcomingFollowUps = await prisma.fieldVisit.findMany({
      where: {
        employeeId: emp.id,
        nextFollowUpDate: { gte: new Date(Date.now() - 86400000 * 2) },
      },
      include: { seller: true, area: true },
      orderBy: { nextFollowUpDate: 'asc' },
      take: 5,
    });

    // 6. Area-wise Breakdown
    const areaStats = assignments.map((a) => {
      const aSellers = sellers.filter((s) => s.areaId === a.areaId);
      const aVisits = visits.filter((v) => v.areaId === a.areaId);
      const aPurchasers = aSellers.filter((s) => s.purchaseCount > 0);
      return {
        areaId: a.areaId,
        areaName: a.area.name,
        sellersCount: aSellers.length,
        visitsCount: aVisits.length,
        purchasingCount: aPurchasers.length,
      };
    });

    // 7. Funnel Breakdown
    const stages = [
      'LEAD_IDENTIFIED',
      'FIRST_CONTACT',
      'INTERESTED',
      'FOLLOW_UP',
      'REGISTERED',
      'FIRST_PURCHASE',
      'REPEAT_CUSTOMER',
    ];
    const conversionStages: Record<string, number> = {};
    const conversionFunnel = stages.map((stg) => {
      const count = sellers.filter((s) => s.stage === stg).length;
      conversionStages[stg] = count;
      return { stage: stg, count };
    });

    const pendingFollowups = upcomingFollowUps.map((f: any) => ({
      sellerId: f.sellerId,
      sellerName: f.seller?.shopName || 'Local Shop',
      areaName: f.area?.name || 'Assigned Area',
      mobileNumber: f.seller?.mobile || '',
      nextFollowUpDate: f.nextFollowUpDate,
      discussionSummary: f.discussionSummary || f.purpose || '',
    }));

    // Find rank in field team
    const allPoints = await prisma.fieldPerformancePoint.findMany({
      where: { monthYear: currentMonth },
    });
    const ptsByEmp: Record<string, number> = {};
    allPoints.forEach((p) => {
      ptsByEmp[p.employeeId] = (ptsByEmp[p.employeeId] || 0) + p.points;
    });
    const sortedRanks = Object.entries(ptsByEmp).sort((a, b) => b[1] - a[1]);
    const myRankIdx = sortedRanks.findIndex(([eId]) => eId === emp.id);
    const myRank = myRankIdx >= 0 ? myRankIdx + 1 : 1;

    return res.json({
      employee: {
        id: emp.id,
        fullName: emp.fullName,
        employeeCode: emp.employeeId,
      },
      kpis: {
        totalAssignedAreas,
        totalAreasVisited: uniqueAreasVisited,
        totalSellersContacted,
        newSellersRegistered: sellers.length,
        verifiedSellers,
        firstTimePurchasingSellers: firstTimePurchasers,
        repeatPurchasingSellers: repeatPurchasers,
        totalVerifiedPurchaseValue,
        monthlyPerformancePoints: monthlyPoints,
        monthlyPoints,
      },
      areas: assignments.map((a) => a.area),
      areaStats,
      conversionStages,
      conversionFunnel,
      recentVisits: visits.slice(0, 6),
      upcomingFollowUps,
      pendingFollowups,
      pointsData: {
        currentMonth,
        rank: myRank,
        monthlyPoints,
      },
    });
  } catch (err: any) {
    console.error('Error fetching employee field dashboard:', err);
    return res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
}

export async function getAdminFieldDashboard(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN' && req.user?.role !== 'ACCOUNTANT') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);

    const [employees, areas, sellers, visits, reports, points] = await Promise.all([
      prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        include: {
          fieldAreaAssignments: { where: { isActive: true }, include: { area: true } },
          registeredSellers: true,
          fieldVisits: true,
          performancePoints: true,
        },
      }),
      prisma.fieldArea.findMany({
        include: { assignments: { where: { isActive: true } } },
      }),
      prisma.fieldSeller.findMany({
        include: { area: true, registeredEmployee: true },
      }),
      prisma.fieldVisit.findMany({
        include: { seller: true, employee: true, area: true },
        orderBy: { visitDate: 'desc' },
        take: 10,
      }),
      prisma.dailyFieldReport.findMany({
        include: { employee: true, area: true },
        orderBy: { reportDate: 'desc' },
      }),
      prisma.fieldPerformancePoint.findMany(),
    ]);

    const totalFieldEmployees = employees.length;
    const totalAssignedAreas = areas.length;
    const areasCovered = new Set(visits.map((v) => v.areaId)).size;
    const totalSellersContacted = sellers.length;
    const totalRegisteredSellers = sellers.length;
    const totalVerifiedSellers = sellers.filter((s) => s.isVerified).length;
    const firstTimePurchasers = sellers.filter((s) => s.purchaseCount === 1).length;
    const repeatCustomers = sellers.filter((s) => s.purchaseCount > 1).length;
    const totalVerifiedPurchaseValue = sellers.reduce(
      (sum, s) => sum + Number(s.totalPurchaseValue || 0),
      0
    );
    const totalEmployeePoints = points
      .filter((p) => p.monthYear === currentMonth)
      .reduce((sum, p) => sum + p.points, 0);

    const pendingReportsCount = reports.filter((r) => r.status === 'PENDING_APPROVAL').length;

    // Employee performance comparison table
    const employeeTable = employees.map((emp) => {
      const empSellers = emp.registeredSellers || [];
      const empPurchasers = empSellers.filter((s) => s.purchaseCount > 0);
      const purchaseVal = empPurchasers.reduce(
        (sum, s) => sum + Number(s.totalPurchaseValue || 0),
        0
      );
      const monthlyPts = (emp.performancePoints || [])
        .filter((p) => p.monthYear === currentMonth)
        .reduce((sum, p) => sum + p.points, 0);

      return {
        id: emp.id,
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        fullName: emp.fullName,
        employeeName: emp.fullName,
        email: emp.email,
        assignedAreas: emp.fieldAreaAssignments.map((a) => a.area.name),
        visitsCount: (emp.fieldVisits || []).length,
        sellersRegistered: empSellers.length,
        purchasingSellers: empPurchasers.length,
        purchaseValue: purchaseVal,
        totalPurchaseValue: purchaseVal,
        points: monthlyPts,
      };
    });

    const metricsOverview = {
      totalEmployees: totalFieldEmployees,
      totalFieldEmployees,
      totalAssignedAreas,
      totalAreasCovered: areasCovered,
      totalSellersContacted,
      totalRegisteredSellers,
      totalVerifiedSellers,
      firstTimePurchasingSellers: firstTimePurchasers,
      totalRepeatCustomers: repeatCustomers,
      firstTimePurchasers,
      repeatCustomers,
      totalVerifiedPurchaseValue,
      totalEmployeePoints,
      pendingReportsCount,
    };

    return res.json({
      overview: metricsOverview,
      kpis: metricsOverview,
      employeePerformance: employeeTable,
      employeeTable,
      recentVisits: visits,
      recentReports: reports.slice(0, 10),
    });
  } catch (err: any) {
    console.error('Error in getAdminFieldDashboard:', err);
    return res.status(500).json({ error: 'Failed to fetch admin field metrics' });
  }
}
