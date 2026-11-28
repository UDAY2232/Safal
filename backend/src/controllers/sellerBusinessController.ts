import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import { notifyLiveSync } from '../services/liveSyncService.js';

// Helper to resolve current employee for logged-in user
async function getEmployeeForUser(userId: string) {
  return prisma.employee.findFirst({
    where: {
      OR: [{ userId }, { user: { id: userId } }],
    },
  });
}

// Helper to classify customer type
export function classifySellerCustomerType(
  orderCount: number,
  lastOrderDate: Date | null,
  interestLevel: string = 'WARM',
  registeredAt: Date = new Date(),
  inactivityDaysThreshold: number = 30
): 'First-Time Buyer' | 'Repeat Buyer' | 'Active' | 'Inactive' | 'Interested' | 'New' | 'Registered' {
  const now = new Date();
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor((now.getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const daysSinceRegistration = Math.floor(
    (now.getTime() - new Date(registeredAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (orderCount === 0) {
    if (daysSinceRegistration <= 14) return 'New';
    if (interestLevel === 'HOT' || interestLevel === 'WARM') return 'Interested';
    return 'Registered';
  }

  if (daysSinceLastOrder !== null && daysSinceLastOrder > inactivityDaysThreshold) {
    return 'Inactive';
  }

  if (orderCount === 1) {
    return 'First-Time Buyer';
  }

  return 'Repeat Buyer';
}

// Generate unique order number e.g. ORD/SF/2026/001
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.fieldSellerOrder.count();
  const nextNum = (count + 1).toString().padStart(3, '0');
  return `ORD/SF/${year}/${nextNum}`;
}

// ==========================================
// 1. EMPLOYEE: MY REGISTERED SELLERS
// ==========================================

export async function getMyRegisteredSellers(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { search, areaId, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    let targetEmployeeId: string | undefined = undefined;

    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (!emp) return res.json({ sellers: [], summary: {} });
      targetEmployeeId = emp.id;
    } else if (req.query.employeeId) {
      targetEmployeeId = req.query.employeeId as string;
    }

    const where: any = {};

    if (targetEmployeeId) {
      where.OR = [
        { registeredEmployeeId: targetEmployeeId },
        { assignedEmployeeId: targetEmployeeId },
      ];
    }

    if (areaId && areaId !== 'all') {
      where.areaId = areaId as string;
    }

    if (search) {
      const q = String(search).trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { shopName: { contains: q, mode: 'insensitive' } },
            { ownerName: { contains: q, mode: 'insensitive' } },
            { mobile: { contains: q } },
            { sellerCode: { contains: q, mode: 'insensitive' } },
            { address: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const sellers = await prisma.fieldSeller.findMany({
      where,
      include: {
        area: true,
        registeredEmployee: {
          select: { id: true, fullName: true, employeeId: true },
        },
        assignedEmployee: {
          select: { id: true, fullName: true, employeeId: true },
        },
        orders: {
          where: { orderStatus: { not: 'CANCELLED' } },
          orderBy: { orderDate: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            orderDate: true,
            orderValue: true,
            paidAmount: true,
            dueAmount: true,
            paymentStatus: true,
            orderStatus: true,
          },
        },
      },
      orderBy: { [String(sortBy)]: sortOrder === 'asc' ? 'asc' : 'desc' },
    });

    const enriched = sellers.map((s) => {
      const totalOrders = s.orders.length;
      const totalRevenue = s.orders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
      const totalPaid = s.orders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0);
      const totalDue = s.orders.reduce((sum, o) => sum + Number(o.dueAmount || 0), 0);
      const lastOrder = s.orders[0];
      const lastOrderDate = lastOrder ? lastOrder.orderDate : s.lastPurchaseDate;
      const classification = classifySellerCustomerType(
        totalOrders,
        lastOrderDate,
        s.interestLevel,
        s.createdAt
      );

      return {
        id: s.id,
        sellerCode: s.sellerCode,
        shopName: s.shopName,
        ownerName: s.ownerName,
        mobile: s.mobile,
        whatsapp: s.whatsapp,
        address: s.address,
        areaId: s.areaId,
        areaName: s.area.name,
        registeredEmployee: s.registeredEmployee,
        assignedEmployee: s.assignedEmployee || s.registeredEmployee,
        registeredDate: s.createdAt,
        sellerStatus: s.stage,
        businessType: s.businessType,
        interestLevel: s.interestLevel,
        totalPurchaseOrders: totalOrders,
        totalPurchaseValue: totalRevenue,
        totalPaidAmount: totalPaid,
        totalDueAmount: totalDue,
        lastPurchaseDate: lastOrderDate,
        customerType: classification,
        isVerified: s.isVerified,
      };
    });

    // Optional filter by customerType
    const filtered = status && status !== 'all'
      ? enriched.filter((s) => s.customerType.toLowerCase() === String(status).toLowerCase())
      : enriched;

    // Summary calculations
    const summary = {
      totalRegisteredSellers: enriched.length,
      activePurchasingSellers: enriched.filter((s) => s.customerType === 'First-Time Buyer' || s.customerType === 'Repeat Buyer' || s.customerType === 'Active').length,
      repeatBuyers: enriched.filter((s) => s.customerType === 'Repeat Buyer').length,
      firstTimeBuyers: enriched.filter((s) => s.customerType === 'First-Time Buyer').length,
      inactiveSellers: enriched.filter((s) => s.customerType === 'Inactive').length,
      interestedSellers: enriched.filter((s) => s.customerType === 'Interested').length,
      newSellers: enriched.filter((s) => s.customerType === 'New').length,
      totalSalesValue: enriched.reduce((sum, s) => sum + s.totalPurchaseValue, 0),
      totalOutstandingDues: enriched.reduce((sum, s) => sum + s.totalDueAmount, 0),
    };

    return res.json({ sellers: filtered, summary });
  } catch (error: any) {
    console.error('getMyRegisteredSellers error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch registered sellers' });
  }
}

// ==========================================
// 2. SELLER BUSINESS PROFILE
// ==========================================

export async function getSellerBusinessProfile(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Seller id is required' });

    const seller = await prisma.fieldSeller.findUnique({
      where: { id },
      include: {
        area: true,
        registeredEmployee: {
          select: { id: true, fullName: true, employeeId: true, phone: true },
        },
        assignedEmployee: {
          select: { id: true, fullName: true, employeeId: true, phone: true },
        },
        orders: {
          orderBy: { orderDate: 'desc' },
          include: {
            items: true,
          },
        },
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 10,
          include: {
            employee: { select: { fullName: true } },
          },
        },
        feedbacks: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        assignmentHistory: {
          orderBy: { transferredAt: 'desc' },
          include: {
            fromEmployee: { select: { fullName: true } },
            toEmployee: { select: { fullName: true } },
          },
        },
      },
    });

    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7); // e.g. 2026-11
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);

    const validOrders = seller.orders.filter((o) => o.orderStatus !== 'CANCELLED');
    const totalOrders = validOrders.length;
    const totalVerifiedValue = validOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
    const totalPaid = validOrders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0);
    const totalDue = validOrders.reduce((sum, o) => sum + Number(o.dueAmount || 0), 0);
    const totalQty = validOrders.reduce((sum, o) => sum + Number(o.totalQuantityKg || 0), 0);

    const currentMonthOrders = validOrders.filter(
      (o) => o.orderDate.toISOString().slice(0, 7) === currentMonthPrefix
    );
    const prevMonthOrders = validOrders.filter(
      (o) => o.orderDate.toISOString().slice(0, 7) === prevMonthPrefix
    );

    const currentMonthVal = currentMonthOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
    const prevMonthVal = prevMonthOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);

    // Fruit breakdown
    const fruitMap: { [fruit: string]: { qty: number; value: number } } = {};
    validOrders.forEach((o) => {
      if (o.items && o.items.length > 0) {
        o.items.forEach((item) => {
          const fn = item.fruitName || 'Standard Fruits';
          if (!fruitMap[fn]) fruitMap[fn] = { qty: 0, value: 0 };
          fruitMap[fn].qty += Number(item.quantity || 0);
          fruitMap[fn].value += Number(item.amount || 0);
        });
      } else if (o.fruitNames) {
        const fn = o.fruitNames;
        if (!fruitMap[fn]) fruitMap[fn] = { qty: 0, value: 0 };
        fruitMap[fn].qty += Number(o.totalQuantityKg || 0);
        fruitMap[fn].value += Number(o.orderValue || 0);
      }
    });

    const averageOrderValue = totalOrders > 0 ? Math.round(totalVerifiedValue / totalOrders) : 0;

    // Calculate repeat purchase frequency (average days between orders)
    let repeatFrequencyDays = 0;
    if (totalOrders > 1) {
      const dates = validOrders.map((o) => new Date(o.orderDate).getTime()).sort((a, b) => a - b);
      const spanDays = (dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24);
      repeatFrequencyDays = Math.round(spanDays / (totalOrders - 1));
    }

    const lastOrder = validOrders[0];
    const customerType = classifySellerCustomerType(
      totalOrders,
      lastOrder ? lastOrder.orderDate : seller.lastPurchaseDate,
      seller.interestLevel,
      seller.createdAt
    );

    return res.json({
      seller: {
        id: seller.id,
        sellerCode: seller.sellerCode,
        shopName: seller.shopName,
        ownerName: seller.ownerName,
        mobile: seller.mobile,
        whatsapp: seller.whatsapp,
        address: seller.address,
        areaId: seller.areaId,
        areaName: seller.area.name,
        district: seller.area.district,
        registeredEmployee: seller.registeredEmployee,
        assignedEmployee: seller.assignedEmployee || seller.registeredEmployee,
        registeredDate: seller.createdAt,
        sellerStatus: seller.stage,
        businessType: seller.businessType,
        interestLevel: seller.interestLevel,
        isVerified: seller.isVerified,
        notes: seller.notes,
        fruitsInterested: seller.fruitsInterested,
        estMonthlyQtyKg: seller.estMonthlyQtyKg,
        estMonthlyValue: seller.estMonthlyValue,
      },
      businessPerformance: {
        totalPurchaseOrders: totalOrders,
        totalVerifiedPurchaseValue: totalVerifiedValue,
        totalPaidAmount: totalPaid,
        totalDueAmount: totalDue,
        currentMonthPurchaseValue: currentMonthVal,
        previousMonthPurchaseValue: prevMonthVal,
        totalQuantityPurchased: totalQty,
        numberOfFruitsPurchased: Object.keys(fruitMap).length,
        fruitBreakdown: Object.entries(fruitMap).map(([fruit, data]) => ({
          fruit,
          quantity: data.qty,
          value: data.value,
        })),
        lastPurchaseDate: lastOrder ? lastOrder.orderDate : seller.lastPurchaseDate,
        firstPurchaseDate: seller.firstPurchaseDate,
        averageOrderValue,
        repeatPurchaseFrequencyDays: repeatFrequencyDays,
        customerType,
      },
      orders: validOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        fruitNames: o.fruitNames,
        totalQuantityKg: o.totalQuantityKg,
        orderValue: o.orderValue,
        paidAmount: o.paidAmount,
        dueAmount: o.dueAmount,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
        linkedPoId: o.linkedPoId,
        linkedInvoiceId: o.linkedInvoiceId,
        isVerified: o.isVerified,
        items: o.items,
        notes: o.notes,
      })),
      visits: seller.visits,
      feedbacks: seller.feedbacks,
      assignmentHistory: seller.assignmentHistory,
    });
  } catch (error: any) {
    console.error('getSellerBusinessProfile error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch seller profile' });
  }
}

// ==========================================
// 3. MONTHLY SELLER BUSINESS DASHBOARD
// ==========================================

export async function getMonthlySellerBusiness(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);

    let targetEmployeeId: string | undefined = undefined;
    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (!emp) return res.json({});
      targetEmployeeId = emp.id;
    } else if (req.query.employeeId) {
      targetEmployeeId = req.query.employeeId as string;
    }

    const sellerWhere: any = {};
    if (targetEmployeeId) {
      sellerWhere.OR = [
        { registeredEmployeeId: targetEmployeeId },
        { assignedEmployeeId: targetEmployeeId },
      ];
    }

    const sellers = await prisma.fieldSeller.findMany({
      where: sellerWhere,
      include: {
        area: true,
        orders: {
          where: { orderStatus: { not: 'CANCELLED' } },
        },
      },
    });

    const monthStartDate = new Date(`${month}-01T00:00:00.000Z`);
    const nextMonthYear = parseInt(month.split('-')[0]);
    const nextMonthNum = parseInt(month.split('-')[1]);
    const monthEndDate = new Date(
      nextMonthNum === 12 ? nextMonthYear + 1 : nextMonthYear,
      nextMonthNum === 12 ? 0 : nextMonthNum,
      1
    );

    // Filter orders belonging to this month
    const allSellerOrders = sellers.flatMap((s) => s.orders);
    const monthOrders = allSellerOrders.filter(
      (o) => new Date(o.orderDate) >= monthStartDate && new Date(o.orderDate) < monthEndDate
    );

    const totalOrdersCount = monthOrders.length;
    const totalSalesValue = monthOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
    const totalQtySold = monthOrders.reduce((sum, o) => sum + Number(o.totalQuantityKg || 0), 0);
    const avgOrderVal = totalOrdersCount > 0 ? Math.round(totalSalesValue / totalOrdersCount) : 0;

    // Classify sellers for this month
    const purchasingSellersInMonth = new Set(monthOrders.map((o) => o.sellerId));
    let firstTimeBuyersInMonth = 0;
    let repeatBuyersInMonth = 0;

    sellers.forEach((s) => {
      if (purchasingSellersInMonth.has(s.id)) {
        const sellerOrdersBeforeMonth = s.orders.filter(
          (o) => new Date(o.orderDate) < monthStartDate
        );
        if (sellerOrdersBeforeMonth.length === 0) {
          firstTimeBuyersInMonth++;
        } else {
          repeatBuyersInMonth++;
        }
      }
    });

    const activePurchasingSellers = purchasingSellersInMonth.size;
    const inactiveSellers = sellers.filter((s) => !purchasingSellersInMonth.has(s.id)).length;

    // Seller-wise business contribution (top sellers)
    const sellerContributionMap: { [sellerId: string]: { seller: any; sales: number; orders: number } } = {};
    monthOrders.forEach((o) => {
      const s = sellers.find((item) => item.id === o.sellerId);
      if (!sellerContributionMap[o.sellerId]) {
        sellerContributionMap[o.sellerId] = {
          seller: {
            id: o.sellerId,
            shopName: s?.shopName || 'Local Seller',
            areaName: s?.area?.name || '',
          },
          sales: 0,
          orders: 0,
        };
      }
      sellerContributionMap[o.sellerId].sales += Number(o.orderValue || 0);
      sellerContributionMap[o.sellerId].orders += 1;
    });

    const sellerContributions = Object.values(sellerContributionMap)
      .map((item) => ({
        ...item,
        percentage: totalSalesValue > 0 ? Math.round((item.sales / totalSalesValue) * 100) : 0,
      }))
      .sort((a, b) => b.sales - a.sales);

    // Month-wise trend (last 6 months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() - i, 1);
      const mStr = d.toISOString().slice(0, 7);
      const mStart = new Date(`${mStr}-01T00:00:00.000Z`);
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);

      const mOrders = allSellerOrders.filter(
        (o) => new Date(o.orderDate) >= mStart && new Date(o.orderDate) < mEnd
      );
      const mSales = mOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);

      trend.push({
        month: mStr,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        ordersCount: mOrders.length,
        salesValue: mSales,
      });
    }

    return res.json({
      month,
      kpis: {
        totalRegisteredSellers: sellers.length,
        firstTimePurchasingSellers: firstTimeBuyersInMonth,
        activePurchasingSellers,
        repeatPurchasingSellers: repeatBuyersInMonth,
        inactiveSellers,
        totalVerifiedOrders: totalOrdersCount,
        totalVerifiedSalesValue: totalSalesValue,
        totalFruitQuantitySold: totalQtySold,
        averageOrderValue: avgOrderVal,
      },
      sellerContributions,
      monthlyTrend: trend,
    });
  } catch (error: any) {
    console.error('getMonthlySellerBusiness error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch monthly seller business' });
  }
}

// ==========================================
// 4. EMPLOYEE SALES PERFORMANCE
// ==========================================

export async function getEmployeeSalesPerformance(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    let targetEmployeeId: string | undefined = undefined;
    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (!emp) return res.json({});
      targetEmployeeId = emp.id;
    } else if (req.query.employeeId) {
      targetEmployeeId = req.query.employeeId as string;
    } else {
      return res.status(400).json({ error: 'employeeId is required for performance check' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: {
        fieldAreaAssignments: {
          where: { isActive: true },
          include: { area: true },
        },
      },
    });

    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    // Sellers registered by this employee
    const registeredSellers = await prisma.fieldSeller.findMany({
      where: { registeredEmployeeId: employee.id },
      include: { orders: { where: { orderStatus: { not: 'CANCELLED' } } } },
    });

    // Sellers currently assigned to this employee
    const assignedSellers = await prisma.fieldSeller.findMany({
      where: { assignedEmployeeId: employee.id },
      include: { orders: { where: { orderStatus: { not: 'CANCELLED' } } } },
    });

    // Combined unique sellers under this employee
    const sellerMap = new Map<string, any>();
    registeredSellers.forEach((s) => sellerMap.set(s.id, s));
    assignedSellers.forEach((s) => sellerMap.set(s.id, s));
    const allManagedSellers = Array.from(sellerMap.values());

    // Orders attributed to this employee
    const orders = await prisma.fieldSellerOrder.findMany({
      where: {
        employeeId: employee.id,
        orderStatus: { not: 'CANCELLED' },
      },
      include: { area: true },
      orderBy: { orderDate: 'desc' },
    });

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);

    const currentMonthOrders = orders.filter(
      (o) => o.orderDate.toISOString().slice(0, 7) === currentMonthPrefix
    );
    const prevMonthOrders = orders.filter(
      (o) => o.orderDate.toISOString().slice(0, 7) === prevMonthPrefix
    );

    const totalSalesValue = orders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
    const monthlySalesValue = currentMonthOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
    const prevMonthSalesValue = prevMonthOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);

    const growthPercentage =
      prevMonthSalesValue > 0
        ? Math.round(((monthlySalesValue - prevMonthSalesValue) / prevMonthSalesValue) * 100)
        : monthlySalesValue > 0
        ? 100
        : 0;

    // Purchasing and repeat sellers
    const purchasingSellersCount = allManagedSellers.filter(
      (s) => s.orders && s.orders.length > 0
    ).length;
    const repeatCustomersCount = allManagedSellers.filter(
      (s) => s.orders && s.orders.length > 1
    ).length;

    // Area-wise contribution
    const areaMap: { [areaId: string]: { areaName: string; sales: number; orders: number; sellers: number } } = {};
    orders.forEach((o) => {
      const aid = o.areaId;
      if (!areaMap[aid]) {
        areaMap[aid] = { areaName: o.area.name, sales: 0, orders: 0, sellers: 0 };
      }
      areaMap[aid].sales += Number(o.orderValue || 0);
      areaMap[aid].orders += 1;
    });

    allManagedSellers.forEach((s) => {
      if (areaMap[s.areaId]) {
        areaMap[s.areaId].sellers += 1;
      }
    });

    const areaContributions = Object.entries(areaMap).map(([id, d]) => ({
      areaId: id,
      areaName: d.areaName,
      sales: d.sales,
      orders: d.orders,
      sellers: d.sellers,
      percentage: totalSalesValue > 0 ? Math.round((d.sales / totalSalesValue) * 100) : 0,
    }));

    return res.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        employeeCode: employee.employeeId,
        department: employee.department,
        designation: employee.designation,
        assignedAreas: employee.fieldAreaAssignments.map((a) => a.area.name),
      },
      performance: {
        sellersOnboarded: registeredSellers.length,
        sellersAssigned: assignedSellers.length,
        totalManagedSellers: allManagedSellers.length,
        purchasingSellers: purchasingSellersCount,
        repeatCustomers: repeatCustomersCount,
        monthlyVerifiedSalesValue: monthlySalesValue,
        totalVerifiedSalesValue: totalSalesValue,
        orderCount: orders.length,
        growthPercentage,
        areaContributions,
      },
    });
  } catch (error: any) {
    console.error('getEmployeeSalesPerformance error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch sales performance' });
  }
}

// ==========================================
// 5. CREATE & VERIFY SELLER ORDER
// ==========================================

export async function createSellerOrder(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const {
      sellerId,
      orderDate,
      fruitNames,
      items,
      totalQuantityKg,
      orderValue,
      paidAmount = 0,
      paymentStatus = 'PAID',
      orderStatus = 'COMPLETED',
      linkedPoId,
      linkedInvoiceId,
      notes,
    } = req.body;

    if (!sellerId) return res.status(400).json({ error: 'sellerId is required' });
    const numOrderValue = Number(orderValue);
    if (!numOrderValue || numOrderValue <= 0) {
      return res.status(400).json({ error: 'Valid positive orderValue is required' });
    }

    const seller = await prisma.fieldSeller.findUnique({
      where: { id: sellerId },
      include: {
        area: true,
        registeredEmployee: true,
        assignedEmployee: true,
      },
    });

    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    // Determine employee attribution: assigned employee, or fallback to registered employee
    let employeeId = seller.assignedEmployeeId || seller.registeredEmployeeId;

    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (emp) {
        // If employee submitted, ensure they are authorized for this seller
        if (seller.registeredEmployeeId !== emp.id && seller.assignedEmployeeId !== emp.id) {
          return res.status(403).json({ error: 'You are not assigned to this seller' });
        }
        employeeId = emp.id;
      }
    }

    const orderNumber = await generateOrderNumber();
    const numPaid = Number(paidAmount) || 0;
    const numDue = Math.max(0, numOrderValue - numPaid);

    // Create the order in database
    const order = await prisma.fieldSellerOrder.create({
      data: {
        orderNumber,
        sellerId: seller.id,
        employeeId,
        areaId: seller.areaId,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        fruitNames: fruitNames || (items && items.length > 0 ? items.map((i: any) => i.fruitName).join(', ') : 'Assorted Fresh Fruits'),
        totalQuantityKg: Number(totalQuantityKg) || 1,
        orderValue: numOrderValue,
        paidAmount: numPaid,
        dueAmount: numDue,
        paymentStatus: numDue === 0 ? 'PAID' : numPaid > 0 ? 'PARTIAL' : 'PENDING',
        orderStatus: orderStatus || 'COMPLETED',
        linkedPoId: linkedPoId || null,
        linkedInvoiceId: linkedInvoiceId || null,
        isVerified: true,
        verifiedById: userId || null,
        notes: notes || null,
        items: items && Array.isArray(items) && items.length > 0
          ? {
              create: items.map((item: any) => ({
                fruitName: item.fruitName,
                quantity: Number(item.quantity) || 1,
                unit: item.unit || 'BOX',
                rate: Number(item.rate) || 0,
                amount: Number(item.amount) || Number(item.quantity || 1) * Number(item.rate || 0),
              })),
            }
          : undefined,
      },
      include: { items: true },
    });

    // Update Seller stats
    const isFirstTime = seller.purchaseCount === 0;
    const newPurchaseCount = seller.purchaseCount + 1;
    const newTotalValue = Number(seller.totalPurchaseValue || 0) + numOrderValue;
    const newStage = isFirstTime ? 'FIRST_PURCHASE' : 'REPEAT_CUSTOMER';

    await prisma.fieldSeller.update({
      where: { id: seller.id },
      data: {
        purchaseCount: newPurchaseCount,
        totalPurchaseValue: newTotalValue,
        firstPurchaseDate: isFirstTime ? new Date(order.orderDate) : seller.firstPurchaseDate,
        firstPurchaseAmount: isFirstTime ? numOrderValue : seller.firstPurchaseAmount,
        lastPurchaseDate: new Date(order.orderDate),
        stage: newStage,
        isVerified: true,
      },
    });

    // Award Points
    const config = await prisma.fieldScoringConfig.findFirst();
    const pointsToAward = isFirstTime
      ? config?.firstPurchasePoints || 50
      : config?.repeatPurchasePoints || 20;

    const currentMonth = new Date().toISOString().slice(0, 7);
    await prisma.fieldPerformancePoint.create({
      data: {
        employeeId,
        points: pointsToAward,
        actionType: isFirstTime ? 'FIRST_PURCHASE' : 'REPEAT_PURCHASE',
        referenceId: order.id,
        reason: `${isFirstTime ? 'First-time purchasing conversion' : 'Repeat customer verified order'}: ${seller.shopName} - Order #${order.orderNumber} (₹${numOrderValue.toLocaleString('en-IN')})`,
        monthYear: currentMonth,
        awardedById: userId,
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Staff',
      userRole: req.user?.role || 'ADMIN',
      action: 'FIELD_SELLER_ORDER_CREATED',
      entityType: 'FieldSellerOrder',
      entityId: order.id,
      details: JSON.stringify({
        orderId: order.id,
        orderNumber: order.orderNumber,
        sellerId: seller.id,
        shopName: seller.shopName,
        orderValue: numOrderValue,
        pointsAwarded: pointsToAward,
      }),
    });

    notifyLiveSync({
      type: 'FIELD_ORDER_CREATED',
      entityId: order.id,
      metadata: { sellerId: seller.id },
    });

    return res.status(201).json({
      message: `Order #${order.orderNumber} recorded and verified successfully!`,
      order,
      pointsAwarded: pointsToAward,
      isFirstTime,
    });
  } catch (error: any) {
    console.error('createSellerOrder error:', error);
    return res.status(500).json({ error: error.message || 'Failed to record seller order' });
  }
}

// ==========================================
// 6. GET ALL SELLER ORDERS (TABLE)
// ==========================================

export async function getSellerOrders(req: AuthRequest, res: Response) {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { sellerId, employeeId, areaId, month, search } = req.query;

    const where: any = {};

    if (userRole === 'EMPLOYEE' && userId) {
      const emp = await getEmployeeForUser(userId);
      if (!emp) return res.json([]);
      where.employeeId = emp.id;
    } else if (employeeId && employeeId !== 'all') {
      where.employeeId = employeeId as string;
    }

    if (sellerId) where.sellerId = sellerId as string;
    if (areaId && areaId !== 'all') where.areaId = areaId as string;

    if (month && month !== 'all') {
      const mStr = String(month);
      const mStart = new Date(`${mStr}-01T00:00:00.000Z`);
      const parts = mStr.split('-');
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]);
      const mEnd = new Date(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1);
      where.orderDate = { gte: mStart, lt: mEnd };
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { fruitNames: { contains: q, mode: 'insensitive' } },
        { seller: { shopName: { contains: q, mode: 'insensitive' } } },
        { seller: { ownerName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const orders = await prisma.fieldSellerOrder.findMany({
      where,
      include: {
        seller: {
          select: { id: true, shopName: true, ownerName: true, mobile: true, sellerCode: true },
        },
        employee: {
          select: { id: true, fullName: true, employeeId: true },
        },
        area: {
          select: { id: true, name: true },
        },
        items: true,
      },
      orderBy: { orderDate: 'desc' },
    });

    return res.json(orders);
  } catch (error: any) {
    console.error('getSellerOrders error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch seller orders' });
  }
}

// ==========================================
// 7. ADMIN: BUSINESS OVERVIEW
// ==========================================

export async function getAdminBusinessOverview(req: AuthRequest, res: Response) {
  try {
    const sellers = await prisma.fieldSeller.findMany({
      include: {
        area: true,
        orders: { where: { orderStatus: { not: 'CANCELLED' } } },
      },
    });

    const allOrders = sellers.flatMap((s) => s.orders);

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7);

    const currentMonthOrders = allOrders.filter(
      (o) => o.orderDate.toISOString().slice(0, 7) === currentMonthPrefix
    );
    const prevMonthOrders = allOrders.filter(
      (o) => o.orderDate.toISOString().slice(0, 7) === prevMonthPrefix
    );

    const totalSalesValue = allOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
    const monthlySalesValue = currentMonthOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
    const prevMonthSalesValue = prevMonthOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);

    const monthOnMonthGrowth =
      prevMonthSalesValue > 0
        ? Math.round(((monthlySalesValue - prevMonthSalesValue) / prevMonthSalesValue) * 100)
        : monthlySalesValue > 0
        ? 100
        : 0;

    const totalOrdersCount = allOrders.length;
    const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalSalesValue / totalOrdersCount) : 0;

    // Customer classifications
    let activePurchasingCount = 0;
    let repeatBuyersCount = 0;
    let inactiveCount = 0;

    sellers.forEach((s) => {
      const classification = classifySellerCustomerType(
        s.orders.length,
        s.orders[0]?.orderDate || s.lastPurchaseDate,
        s.interestLevel,
        s.createdAt
      );
      if (classification === 'First-Time Buyer' || classification === 'Repeat Buyer') {
        activePurchasingCount++;
      }
      if (classification === 'Repeat Buyer') {
        repeatBuyersCount++;
      }
      if (classification === 'Inactive') {
        inactiveCount++;
      }
    });

    return res.json({
      kpis: {
        totalRegisteredSellers: sellers.length,
        totalActivePurchasingSellers: activePurchasingCount,
        totalRepeatBuyers: repeatBuyersCount,
        totalInactiveSellers: inactiveCount,
        totalMonthlySalesValue: monthlySalesValue,
        totalVerifiedOrders: totalOrdersCount,
        totalVerifiedSalesValue: totalSalesValue,
        averageOrderValue: avgOrderValue,
        monthOnMonthGrowth,
      },
    });
  } catch (error: any) {
    console.error('getAdminBusinessOverview error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch admin business overview' });
  }
}

// ==========================================
// 8. ADMIN: EMPLOYEE-WISE BUSINESS PERFORMANCE
// ==========================================

export async function getAdminEmployeePerformance(req: AuthRequest, res: Response) {
  try {
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        fieldAreaAssignments: {
          where: { isActive: true },
          include: { area: true },
        },
        registeredSellers: {
          include: { orders: { where: { orderStatus: { not: 'CANCELLED' } } } },
        },
        assignedSellers: {
          include: { orders: { where: { orderStatus: { not: 'CANCELLED' } } } },
        },
        sellerOrders: {
          where: { orderStatus: { not: 'CANCELLED' } },
        },
        performancePoints: true,
      },
      orderBy: { fullName: 'asc' },
    });

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);

    const result = employees.map((emp) => {
      // Combine unique sellers registered or assigned
      const sellerMap = new Map<string, any>();
      emp.registeredSellers.forEach((s) => sellerMap.set(s.id, s));
      emp.assignedSellers.forEach((s) => sellerMap.set(s.id, s));
      const allSellers = Array.from(sellerMap.values());

      const purchasingSellers = allSellers.filter((s) => s.orders && s.orders.length > 0).length;
      const repeatBuyers = allSellers.filter((s) => s.orders && s.orders.length > 1).length;

      const totalSalesValue = emp.sellerOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
      const monthlyOrders = emp.sellerOrders.filter(
        (o) => o.orderDate.toISOString().slice(0, 7) === currentMonthPrefix
      );
      const monthlySalesValue = monthlyOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);

      const totalPoints = emp.performancePoints.reduce((sum, p) => sum + p.points, 0);

      return {
        employeeId: emp.id,
        fullName: emp.fullName,
        employeeCode: emp.employeeId,
        phone: emp.phone,
        designation: emp.designation,
        assignedAreas: emp.fieldAreaAssignments.map((a) => a.area.name),
        registeredSellersCount: emp.registeredSellers.length,
        totalManagedSellersCount: allSellers.length,
        purchasingSellersCount: purchasingSellers,
        repeatBuyersCount: repeatBuyers,
        ordersCount: emp.sellerOrders.length,
        totalSalesValue,
        monthlySalesValue,
        totalPoints,
      };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('getAdminEmployeePerformance error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch employee performance' });
  }
}

// ==========================================
// 9. ADMIN: AREA-WISE BUSINESS PERFORMANCE
// ==========================================

export async function getAdminAreaPerformance(req: AuthRequest, res: Response) {
  try {
    const areas = await prisma.fieldArea.findMany({
      include: {
        assignments: {
          where: { isActive: true },
          include: { employee: { select: { fullName: true } } },
        },
        sellers: {
          include: { orders: { where: { orderStatus: { not: 'CANCELLED' } } } },
        },
        sellerOrders: {
          where: { orderStatus: { not: 'CANCELLED' } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);

    const result = areas.map((area) => {
      const sellersCount = area.sellers.length;
      const purchasingSellersCount = area.sellers.filter((s) => s.orders && s.orders.length > 0).length;
      const repeatBuyersCount = area.sellers.filter((s) => s.orders && s.orders.length > 1).length;

      const totalSalesValue = area.sellerOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
      const monthlyOrders = area.sellerOrders.filter(
        (o) => o.orderDate.toISOString().slice(0, 7) === currentMonthPrefix
      );
      const monthlySalesValue = monthlyOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);

      return {
        areaId: area.id,
        areaName: area.name,
        district: area.district || 'Telangana',
        assignedEmployees: area.assignments.map((a) => a.employee.fullName),
        sellersCount,
        purchasingSellersCount,
        repeatBuyersCount,
        ordersCount: area.sellerOrders.length,
        totalSalesValue,
        monthlySalesValue,
      };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('getAdminAreaPerformance error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch area performance' });
  }
}

// ==========================================
// 10. ADMIN: SELLER-WISE BUSINESS REPORTS
// ==========================================

export async function getAdminSellerReports(req: AuthRequest, res: Response) {
  try {
    const sellers = await prisma.fieldSeller.findMany({
      include: {
        area: true,
        registeredEmployee: { select: { id: true, fullName: true, employeeId: true } },
        assignedEmployee: { select: { id: true, fullName: true, employeeId: true } },
        orders: {
          where: { orderStatus: { not: 'CANCELLED' } },
          orderBy: { orderDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const currentMonthPrefix = now.toISOString().slice(0, 7);

    const result = sellers.map((s) => {
      const totalOrders = s.orders.length;
      const totalPurchaseValue = s.orders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);
      const totalPaid = s.orders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0);
      const totalDue = s.orders.reduce((sum, o) => sum + Number(o.dueAmount || 0), 0);

      const monthlyOrders = s.orders.filter(
        (o) => o.orderDate.toISOString().slice(0, 7) === currentMonthPrefix
      );
      const monthlyPurchaseValue = monthlyOrders.reduce((sum, o) => sum + Number(o.orderValue || 0), 0);

      const lastOrder = s.orders[0];
      const customerType = classifySellerCustomerType(
        totalOrders,
        lastOrder?.orderDate || s.lastPurchaseDate,
        s.interestLevel,
        s.createdAt
      );

      return {
        id: s.id,
        sellerCode: s.sellerCode,
        shopName: s.shopName,
        ownerName: s.ownerName,
        mobile: s.mobile,
        whatsapp: s.whatsapp,
        address: s.address,
        areaName: s.area.name,
        employeeName: s.assignedEmployee?.fullName || s.registeredEmployee.fullName,
        registeredEmployee: s.registeredEmployee.fullName,
        registrationDate: s.createdAt,
        totalOrders,
        totalPurchaseValue,
        monthlyPurchaseValue,
        totalPaid,
        totalDue,
        lastPurchaseDate: lastOrder?.orderDate || s.lastPurchaseDate,
        firstPurchaseDate: s.firstPurchaseDate,
        customerType,
        stage: s.stage,
        isVerified: s.isVerified,
      };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('getAdminSellerReports error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch seller reports' });
  }
}

// ==========================================
// 11. ADMIN: MONTHLY REPORT (EXPORTABLE)
// ==========================================

export async function getAdminMonthlyReport(req: AuthRequest, res: Response) {
  try {
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const parts = month.split('-');
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const monthEnd = new Date(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1);

    const sellers = await prisma.fieldSeller.findMany({
      include: {
        area: true,
        registeredEmployee: true,
        assignedEmployee: true,
        orders: {
          where: { orderStatus: { not: 'CANCELLED' } },
        },
      },
    });

    const monthOrders = await prisma.fieldSellerOrder.findMany({
      where: {
        orderDate: { gte: monthStart, lt: monthEnd },
        orderStatus: { not: 'CANCELLED' },
      },
      include: {
        seller: true,
        employee: true,
        area: true,
      },
    });

    // Employee-wise acquisition and sales
    const employeeMap: { [empId: string]: { name: string; registered: number; sales: number; orders: number } } = {};
    sellers.forEach((s) => {
      const isRegisteredInMonth = s.createdAt >= monthStart && s.createdAt < monthEnd;
      const empId = s.registeredEmployeeId;
      if (!employeeMap[empId]) {
        employeeMap[empId] = { name: s.registeredEmployee.fullName, registered: 0, sales: 0, orders: 0 };
      }
      if (isRegisteredInMonth) employeeMap[empId].registered++;
    });

    monthOrders.forEach((o) => {
      const empId = o.employeeId;
      if (!employeeMap[empId]) {
        employeeMap[empId] = { name: o.employee.fullName, registered: 0, sales: 0, orders: 0 };
      }
      employeeMap[empId].sales += Number(o.orderValue || 0);
      employeeMap[empId].orders++;
    });

    // Area-wise business in month
    const areaMap: { [areaId: string]: { name: string; sales: number; orders: number } } = {};
    monthOrders.forEach((o) => {
      if (!areaMap[o.areaId]) {
        areaMap[o.areaId] = { name: o.area.name, sales: 0, orders: 0 };
      }
      areaMap[o.areaId].sales += Number(o.orderValue || 0);
      areaMap[o.areaId].orders++;
    });

    // Top performing sellers in month
    const sellerSalesMap: { [sellerId: string]: { name: string; area: string; sales: number; orders: number } } = {};
    monthOrders.forEach((o) => {
      if (!sellerSalesMap[o.sellerId]) {
        sellerSalesMap[o.sellerId] = {
          name: o.seller.shopName,
          area: o.area.name,
          sales: 0,
          orders: 0,
        };
      }
      sellerSalesMap[o.sellerId].sales += Number(o.orderValue || 0);
      sellerSalesMap[o.sellerId].orders++;
    });

    const topSellers = Object.values(sellerSalesMap).sort((a, b) => b.sales - a.sales).slice(0, 10);

    // Inactive sellers requiring follow-up (no purchase in 30 days)
    const activeSellerIds = new Set(monthOrders.map((o) => o.sellerId));
    const inactiveSellers = sellers
      .filter((s) => !activeSellerIds.has(s.id))
      .map((s) => ({
        id: s.id,
        shopName: s.shopName,
        ownerName: s.ownerName,
        mobile: s.mobile,
        areaName: s.area.name,
        employeeName: s.assignedEmployee?.fullName || s.registeredEmployee.fullName,
        lastPurchaseDate: s.lastPurchaseDate,
        interestLevel: s.interestLevel,
      }));

    return res.json({
      month,
      employeeReport: Object.values(employeeMap),
      areaReport: Object.values(areaMap),
      topSellers,
      inactiveSellersCount: inactiveSellers.length,
      inactiveSellers: inactiveSellers.slice(0, 20),
    });
  } catch (error: any) {
    console.error('getAdminMonthlyReport error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch admin monthly report' });
  }
}

// ==========================================
// 12. ADMIN: TRANSFER SELLER ATTRIBUTION
// ==========================================

export async function transferSellerAttribution(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin permission required to transfer seller' });
    }

    const { sellerId, toEmployeeId, reason } = req.body;
    if (!sellerId || !toEmployeeId) {
      return res.status(400).json({ error: 'sellerId and toEmployeeId are required' });
    }

    const seller = await prisma.fieldSeller.findUnique({
      where: { id: sellerId },
    });
    if (!seller) return res.status(404).json({ error: 'Seller not found' });

    const targetEmployee = await prisma.employee.findUnique({
      where: { id: toEmployeeId },
    });
    if (!targetEmployee) return res.status(404).json({ error: 'Target employee not found' });

    const previousEmployeeId = seller.assignedEmployeeId || seller.registeredEmployeeId;

    // Record assignment history
    await prisma.fieldSellerAssignmentHistory.create({
      data: {
        sellerId: seller.id,
        fromEmployeeId: previousEmployeeId,
        toEmployeeId: targetEmployee.id,
        transferredById: req.user?.id,
        reason: reason || 'Territory realignment',
      },
    });

    // Update seller assigned employee
    const updated = await prisma.fieldSeller.update({
      where: { id: seller.id },
      data: { assignedEmployeeId: targetEmployee.id },
      include: {
        assignedEmployee: { select: { fullName: true } },
      },
    });

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: 'ADMIN',
      action: 'FIELD_SELLER_TRANSFERRED',
      entityType: 'FieldSeller',
      entityId: seller.id,
      details: JSON.stringify({
        sellerId: seller.id,
        fromEmployeeId: previousEmployeeId,
        toEmployeeId: targetEmployee.id,
        reason,
      }),
    });

    return res.json({
      message: `Seller ${seller.shopName} successfully transferred to ${targetEmployee.fullName}`,
      seller: updated,
    });
  } catch (error: any) {
    console.error('transferSellerAttribution error:', error);
    return res.status(500).json({ error: error.message || 'Failed to transfer seller' });
  }
}
