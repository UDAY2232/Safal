import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

export async function getSuppliers(req: AuthRequest, res: Response) {
  try {
    const { search, status } = req.query;

    const where: any = {};
    if (status && status !== 'All') {
      where.status = status as string;
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { supplierCode: { contains: search as string, mode: 'insensitive' } },
        { contactPerson: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      include: {
        purchaseOrders: {
          select: {
            id: true,
            grandTotal: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = suppliers.map((s) => {
      const poCount = s.purchaseOrders.length;
      const totalAmount = s.purchaseOrders.reduce((sum, po) => sum + Number(po.grandTotal), 0);
      return {
        id: s.id,
        supplierCode: s.supplierCode,
        name: s.name,
        contactPerson: s.contactPerson,
        email: s.email,
        phone: s.phone,
        address: s.address,
        country: s.country,
        category: s.category,
        paymentTerms: s.paymentTerms,
        status: s.status,
        notes: s.notes,
        poCount,
        totalPOValue: totalAmount,
      };
    });

    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
}

export async function getSupplierById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { poDate: 'desc' },
          include: {
            financialRecord: true,
          },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    return res.json(supplier);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch supplier details' });
  }
}

export async function createSupplier(req: AuthRequest, res: Response) {
  try {
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      country = 'India',
      category = 'Wholesale Fruits',
      paymentTerms = 'Net 30',
      notes,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const count = await prisma.supplier.count();
    const supplierCode = `SUP-${String(count + 1).padStart(3, '0')}`;

    const supplier = await prisma.supplier.create({
      data: {
        supplierCode,
        name,
        contactPerson,
        email,
        phone,
        address,
        country,
        category,
        paymentTerms,
        notes,
        status: 'ACTIVE',
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIER',
      entityId: supplier.id,
      details: `Created supplier ${supplier.name} (${supplier.supplierCode})`,
      ipAddress: req.ip,
    });

    return res.status(201).json(supplier);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create supplier' });
  }
}

export async function updateSupplier(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      country,
      category,
      paymentTerms,
      status,
      notes,
    } = req.body;

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        contactPerson,
        email,
        phone,
        address,
        country,
        category,
        paymentTerms,
        status,
        notes,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'User',
      userRole: req.user?.role || 'UNKNOWN',
      action: 'SUPPLIER_UPDATED',
      entityType: 'SUPPLIER',
      entityId: id,
      details: `Updated supplier ${updated.name}`,
      ipAddress: req.ip,
    });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update supplier' });
  }
}

