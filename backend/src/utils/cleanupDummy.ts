import { prisma } from '../config/db.js';

export async function cleanupDummyOrders() {
  try {
    const dummyOrders = await prisma.purchaseOrder.findMany({
      where: {
        OR: [
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
        await prisma.purchaseOrder.delete({
          where: { id: order.id },
        });
      }
      console.log(`[CLEANUP] Successfully cleaned up dummy orders.`);
    }
  } catch (err) {
    console.warn('[CLEANUP] Warning during dummy orders cleanup:', err);
  }
}
