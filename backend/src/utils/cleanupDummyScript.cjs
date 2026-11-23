const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Cleaning up dummy test records ---');
  const dummy = await prisma.purchaseOrder.findMany({
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
    select: { id: true, poNumber: true, supplier: { select: { name: true } } },
  });

  console.log(`Found ${dummy.length} dummy order(s):`, dummy);

  for (const d of dummy) {
    await prisma.purchaseOrder.delete({ where: { id: d.id } });
    console.log(`Deleted order ${d.poNumber} (${d.id})`);
  }

  const remaining = await prisma.purchaseOrder.findMany({
    where: {
      NOT: {
        poNumber: { startsWith: 'CD/' },
      },
    },
    select: { poNumber: true, status: true },
  });
  console.log(`Current Live POs count: ${remaining.length}`, remaining);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
