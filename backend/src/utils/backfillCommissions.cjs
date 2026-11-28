const { PrismaClient } = require('@prisma/client');

try {
  require('dotenv').config({ path: '/etc/safal/app.env' });
} catch (e) {}
try {
  require('dotenv').config();
} catch (e) {}

const prisma = new PrismaClient();

async function backfillCommissions() {
  console.log('🔄 Backfilling historical PO commissions...');
  const pos = await prisma.purchaseOrder.findMany({
    include: {
      supplier: true,
      createdBy: true,
    },
  });

  console.log(`Found ${pos.length} total PO records.`);

  let vendorCount = 0;
  let adminCount = 0;

  for (const po of pos) {
    const isVendor =
      po.creatorRole === 'VENDOR' ||
      Boolean(po.vendorProfileId) ||
      (po.supplier && po.supplier.supplierCode && po.supplier.supplierCode.startsWith('VND-')) ||
      (po.notes && po.notes.includes('Vendor Consignment'));

    const grand = Number(po.grandTotal || 0);

    if (isVendor) {
      const safalComm = Math.round((grand * 0.05) * 100) / 100;
      const apmcComm = Math.round((grand * 0.01) * 100) / 100;
      const totalComm = Math.round((safalComm + apmcComm) * 100) / 100;
      const netPayable = Math.max(0, grand - totalComm);

      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: {
          creatorRole: 'VENDOR',
          safalCommissionRate: 5,
          safalCommissionAmount: safalComm,
          apmcCommissionRate: 1,
          apmcCommissionAmount: apmcComm,
          totalCommissionAmount: totalComm,
          netPayableAmount: netPayable,
          commissionSettlementRule: 'DEDUCTION_FROM_PAYABLE',
        },
      });
      vendorCount++;
    } else {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: {
          creatorRole: po.createdBy && po.createdBy.role === 'EMPLOYEE' ? 'EMPLOYEE' : 'ADMIN',
          safalCommissionRate: 0,
          safalCommissionAmount: 0,
          apmcCommissionRate: 0,
          apmcCommissionAmount: 0,
          totalCommissionAmount: 0,
          netPayableAmount: grand,
          commissionSettlementRule: 'NO_COMMISSION',
        },
      });
      adminCount++;
    }
  }

  console.log(`✅ Backfill complete: ${vendorCount} Vendor POs and ${adminCount} Admin/Staff POs classified.`);
}

backfillCommissions()
  .catch((e) => {
    console.error('Error backfilling commissions:', e);
  })
  .finally(() => {
    prisma.$disconnect();
    process.exit(0);
  });
