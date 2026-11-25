import { prisma } from '../config/db.js';

export async function cleanupDummyOrders() {
  try {
    // 1. Reset test PO PO/SF/2026/014 so user can cleanly test the full lifecycle:
    // PO Request -> Admin Allots Vehicle -> Vendor Loads & Dispatches -> Hub Delivery
    await prisma.purchaseOrder.updateMany({
      where: {
        poNumber: 'PO/SF/2026/014',
      },
      data: {
        dispatchStatus: 'PENDING_DISPATCH',
        dispatchVehicleNumber: null,
        vehiclePhotoUrl: null,
        transporterName: null,
        driverPhone: null,
        dispatchDate: null,
        status: 'PENDING_APPROVAL',
      },
    });

    // 2. Automatically fix any active PO where vendor has not actually completed loading & dispatch
    await prisma.purchaseOrder.updateMany({
      where: {
        status: { in: ['PENDING_APPROVAL', 'APPROVED'] },
        OR: [
          { dispatchVehicleNumber: null },
          { dispatchVehicleNumber: '' },
          { dispatchVehicleNumber: '-' },
          { vehiclePhotoUrl: null },
          { dispatchDate: null },
        ],
        dispatchStatus: { not: 'DELIVERED_AT_HUB' },
      },
      data: {
        dispatchStatus: 'PENDING_DISPATCH',
      },
    });

    const dummyOrders = await prisma.purchaseOrder.findMany({
      where: {
        OR: [
          { poNumber: 'PO/SF/2026/020' },
          { poNumber: { equals: 'po number', mode: 'insensitive' } },
          { poNumber: { equals: 'po number ', mode: 'insensitive' } },
          { poNumber: { contains: 'po number', mode: 'insensitive' } },
          {
            supplier: {
              name: { contains: 'ekkada po thiskuna person name', mode: 'insensitive' },
            },
          },
        ],
      },
      select: { id: true, poNumber: true },
    });

    if (dummyOrders.length > 0) {
      console.log(`[CLEANUP] Found ${dummyOrders.length} dummy order(s) to remove:`, dummyOrders.map(o => o.poNumber));
      for (const order of dummyOrders) {
        await prisma.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: order.id },
        });
        await prisma.purchaseOrder.delete({
          where: { id: order.id },
        });
      }
      console.log(`[CLEANUP] Successfully cleaned up dummy orders.`);
    }

    // 4. Migrate vendor VND-002 to VND-599 as per reverse countdown ID sequence (VND-599, VND-598...)
    const vnd002 = await prisma.vendorProfile.findUnique({
      where: { vendorId: 'VND-002' },
    });
    if (vnd002) {
      const vnd599 = await prisma.vendorProfile.findUnique({
        where: { vendorId: 'VND-599' },
      });
      if (!vnd599) {
        await prisma.vendorProfile.update({
          where: { id: vnd002.id },
          data: { vendorId: 'VND-599' },
        });
        await prisma.supplier.updateMany({
          where: { supplierCode: 'VND-002' },
          data: { supplierCode: 'VND-599' },
        });
        console.log('✓ Successfully migrated vendor VND-002 to reverse sequence ID VND-599');
      }
    }
  } catch (err) {
    console.warn('[CLEANUP] Warning during dummy orders cleanup:', err);
  }
}
