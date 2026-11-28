import { prisma } from '../config/db.js';

async function main() {
  const isCD = (p: any) => p.poNumber?.startsWith('CD/') || p.supplier?.category === 'Customer Due';
  const isOrderRejected = (p: any) =>
    p.status === 'REJECTED' || Boolean(p.rejectionReason && String(p.rejectionReason).trim() !== '');

  const pos = await prisma.purchaseOrder.findMany({
    include: { supplier: true, createdBy: true },
    orderBy: { createdAt: 'asc' },
  });

  const cds = pos.filter(isCD);

  console.log('\n========================================================================================');
  console.log('              SAFAL EXPORT AND IMPORT PVT LTD - CUSTOMER DUES (CD) AUDIT');
  console.log('========================================================================================');
  console.log(`Total Customer Dues (CDs) in Database: ${cds.length}\n`);

  let grandTotalSum = 0;
  let totalAdvanceSum = 0;
  let totalPendingDueSum = 0;
  let rejectedCount = 0;
  let openCount = 0;
  let closedCount = 0;

  console.log(
    '#' +
      ' | ' +
      'CD Number'.padEnd(16) +
      ' | ' +
      'Date'.padEnd(11) +
      ' | ' +
      'Buyer / Customer'.padEnd(24) +
      ' | ' +
      'Status'.padEnd(8) +
      ' | ' +
      'Grand Total'.padStart(12) +
      ' | ' +
      'Paid / Adv'.padStart(11) +
      ' | ' +
      'Pending Due'.padStart(12)
  );
  console.log('----------------------------------------------------------------------------------------');

  cds.forEach((cd, idx) => {
    const isRej = isOrderRejected(cd);
    const grand = Number(cd.grandTotal || 0);
    const adv = Number(cd.advanceAmount || 0);
    const pending = Number(cd.pendingAmount ?? Math.max(0, grand - adv));
    const dateStr = cd.poDate ? new Date(cd.poDate).toLocaleDateString('en-IN') : 'N/A';
    const customer = (cd.supplier?.name || 'N/A').slice(0, 24);

    if (isRej) {
      rejectedCount++;
    } else {
      grandTotalSum += grand;
      totalAdvanceSum += adv;
      totalPendingDueSum += pending;

      if (cd.status === 'CLOSED' && pending <= 0) {
        closedCount++;
      } else {
        openCount++;
      }
    }

    console.log(
      String(idx + 1).padStart(2, ' ') +
        ' | ' +
        cd.poNumber.padEnd(16) +
        ' | ' +
        dateStr.padEnd(11) +
        ' | ' +
        customer.padEnd(24) +
        ' | ' +
        (isRej ? 'REJECT' : cd.status).padEnd(8) +
        ' | ' +
        ('₹' + grand.toLocaleString('en-IN')).padStart(12) +
        ' | ' +
        ('₹' + adv.toLocaleString('en-IN')).padStart(11) +
        ' | ' +
        ('₹' + pending.toLocaleString('en-IN')).padStart(12)
    );
  });

  console.log('========================================================================================');
  console.log('                                  AUDITED SUMMARY');
  console.log('========================================================================================');
  console.log(`• Total CD Records:                   ${cds.length}`);
  console.log(`• Active / Open CDs:                  ${openCount}`);
  console.log(`• Settled / Closed CDs:               ${closedCount}`);
  console.log(`• Rejected CDs:                       ${rejectedCount}`);
  console.log('----------------------------------------------------------------------------------------');
  console.log(`• TOTAL CD AMOUNT (Gross Billing):    ₹${grandTotalSum.toLocaleString('en-IN')}`);
  console.log(`• TOTAL PAID / ADVANCE COLLECTED:     ₹${totalAdvanceSum.toLocaleString('en-IN')}`);
  console.log(`• TOTAL PENDING DUE (Remaining Dues): ₹${totalPendingDueSum.toLocaleString('en-IN')}`);
  console.log('========================================================================================\n');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
