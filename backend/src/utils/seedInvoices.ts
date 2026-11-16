import { prisma } from '../config/db.js';

async function seedInvoices() {
  console.log('🌱 Seeding realistic Invoices for SAFAL EXPORT AND IMPORT PVT LTD...');

  const count = await prisma.invoice.count();
  if (count > 0) {
    console.log(`ℹ️ Already have ${count} invoices in database. Skipping seed.`);
    return;
  }

  const sampleInvoices = [
    {
      invoiceNumber: 'INV/SF/2026/001',
      invoiceType: 'EXPORT' as const,
      partyName: 'Apex Fresh Foods Trading LLC (Dubai)',
      partyGst: 'TRN-1002948192003',
      partyAddress: 'Al Aweer Fruit & Vegetable Market, Warehouse 42, Dubai, UAE',
      partyEmail: 'procurement@apexfreshdubai.ae',
      partyPhone: '+971 4 333 8921',
      invoiceDate: new Date('2026-11-02'),
      dueDate: new Date('2026-11-17'),
      linkedPoNumber: 'PO/SF/2026/001',
      subtotal: 4500000,
      taxRate: 5,
      taxAmount: 225000,
      freightShipping: 125000,
      grandTotal: 4850000,
      amountPaid: 4850000,
      balanceDue: 0,
      status: 'PAID' as const,
      paymentTerms: 'LC at Sight / Telegraphic Transfer',
      paymentMethod: 'Wire Transfer (Emirates NBD)',
      notes: 'Customs cleared through Nhava Sheva JNPT port, refrigerated reefer container #MSKU-82910.',
      items: [
        {
          description: 'Ratnagiri Alphonso Mangoes (Grade-A Export Quality)',
          hsnCode: '08045020',
          quantity: 1500,
          unit: 'BOX',
          rate: 2000,
          amount: 3000000,
        },
        {
          description: 'Bhagwa Pomegranates (Red Pearl Grade)',
          hsnCode: '08109010',
          quantity: 1000,
          unit: 'BOX',
          rate: 1500,
          amount: 1500000,
        },
      ],
    },
    {
      invoiceNumber: 'INV/SF/2026/002',
      invoiceType: 'SALES' as const,
      partyName: 'Reliance Retail Wholesale Division (Mumbai)',
      partyGst: '27AABCR1234F1Z8',
      partyAddress: 'Turbhe APMC Complex, Vashi, Navi Mumbai 400705',
      partyEmail: 'fruit.purchase@relianceretail.com',
      partyPhone: '+91 22 4192 8800',
      invoiceDate: new Date('2026-11-05'),
      dueDate: new Date('2026-11-20'),
      linkedPoNumber: 'PO/SF/2026/002',
      subtotal: 3250000,
      taxRate: 5,
      taxAmount: 162500,
      freightShipping: 67500,
      grandTotal: 3480000,
      amountPaid: 3480000,
      balanceDue: 0,
      status: 'PAID' as const,
      paymentTerms: 'Net 15 Days',
      paymentMethod: 'RTGS (HDFC Bank)',
      notes: 'Delivered in 4 refrigerated temperature-controlled trucks directly to Vashi central hub.',
      items: [
        {
          description: 'Shimla Royal Delicious Fresh Apples (Cold Chain Hub 1)',
          hsnCode: '08081000',
          quantity: 2500,
          unit: 'CRATE',
          rate: 1300,
          amount: 3250000,
        },
      ],
    },
    {
      invoiceNumber: 'INV/SF/2026/003',
      invoiceType: 'EXPORT' as const,
      partyName: 'Al Maya Supermarkets Group (Sharjah)',
      partyGst: 'TRN-2004918290001',
      partyAddress: 'Industrial Area 15, Sharjah Central Depot, UAE',
      partyEmail: 'orders@almayagroup.ae',
      partyPhone: '+971 6 534 5500',
      invoiceDate: new Date('2026-11-08'),
      dueDate: new Date('2026-11-23'),
      linkedPoNumber: 'PO/SF/2026/003',
      subtotal: 1750000,
      taxRate: 5,
      taxAmount: 87500,
      freightShipping: 57500,
      grandTotal: 1895000,
      amountPaid: 1000000,
      balanceDue: 895000,
      status: 'PARTIALLY_PAID' as const,
      paymentTerms: '50% Advance, Balance on Airway Bill Proof',
      paymentMethod: 'SWIFT International Transfer',
      notes: 'Part payment received. Remaining ₹8,95,000 due upon air consignment clearance at Dubai DWC.',
      items: [
        {
          description: 'Gujarat Kesar Mangoes (Export Pack 3.5kg)',
          hsnCode: '08045030',
          quantity: 1000,
          unit: 'BOX',
          rate: 1750,
          amount: 1750000,
        },
      ],
    },
    {
      invoiceNumber: 'INV/SF/2026/004',
      invoiceType: 'IMPORT' as const,
      partyName: 'Lulu Hypermarket International (Abu Dhabi)',
      partyGst: 'TRN-9092817260002',
      partyAddress: 'Lulu Regional Procurement Depot, Mafraq, Abu Dhabi',
      partyEmail: 'procurement.fruits@luluhypermarket.com',
      partyPhone: '+971 2 418 2000',
      invoiceDate: new Date('2026-11-10'),
      dueDate: new Date('2026-11-25'),
      linkedPoNumber: 'PO/SF/2026/005',
      subtotal: 3950000,
      taxRate: 5,
      taxAmount: 197500,
      freightShipping: 77500,
      grandTotal: 4225000,
      amountPaid: 0,
      balanceDue: 4225000,
      status: 'PENDING' as const,
      paymentTerms: 'Net 15 Days after container inspection',
      paymentMethod: 'Letter of Credit (LC)',
      notes: 'Reefer container consignment en route. Inspection scheduled upon berthing at Mina Zayed.',
      items: [
        {
          description: 'Washington State Extra Fancy Red Delicious Apples',
          hsnCode: '08081000',
          quantity: 1800,
          unit: 'CARTON',
          rate: 2194.44,
          amount: 3950000,
        },
      ],
    },
    {
      invoiceNumber: 'INV/SF/2026/005',
      invoiceType: 'SALES' as const,
      partyName: "Nature's Basket Gourmet Chain (Bangalore)",
      partyGst: '29AAACN8192K1ZF',
      partyAddress: 'Whitefield Distribution Hub, EPIP Zone, Bangalore 560066',
      partyEmail: 'fresh.procure@naturesbasket.co.in',
      partyPhone: '+91 80 4912 3344',
      invoiceDate: new Date('2026-11-12'),
      dueDate: new Date('2026-11-27'),
      linkedPoNumber: 'PO/SF/2026/007',
      subtotal: 1350000,
      taxRate: 5,
      taxAmount: 67500,
      freightShipping: 42500,
      grandTotal: 1460000,
      amountPaid: 0,
      balanceDue: 1460000,
      status: 'PENDING' as const,
      paymentTerms: 'Net 15 Days',
      paymentMethod: 'NEFT Transfer',
      notes: 'Cold storage dispatch from Hyderabad hub via specialized temperature loggers.',
      items: [
        {
          description: 'Chilean Fresh Green Kiwis (Hayward Variety)',
          hsnCode: '08105000',
          quantity: 600,
          unit: 'CRATE',
          rate: 1450,
          amount: 870000,
        },
        {
          description: 'Himalayan Fresh Blueberries (Export Grade Clamshells)',
          hsnCode: '08104000',
          quantity: 400,
          unit: 'BOX',
          rate: 1200,
          amount: 480000,
        },
      ],
    },
    {
      invoiceNumber: 'INV/SF/2026/006',
      invoiceType: 'EXPORT' as const,
      partyName: 'Fresh Valley Agro Importers (Singapore)',
      partyGst: 'UEN-201829102K',
      partyAddress: 'Pasir Panjang Wholesale Centre #03-18, Singapore 110001',
      partyEmail: 'accounts@freshvalleysg.com',
      partyPhone: '+65 6778 9200',
      invoiceDate: new Date('2026-10-25'),
      dueDate: new Date('2026-11-09'),
      linkedPoNumber: 'PO/SF/2026/009',
      subtotal: 2080000,
      taxRate: 5,
      taxAmount: 104000,
      freightShipping: 56000,
      grandTotal: 2240000,
      amountPaid: 0,
      balanceDue: 2240000,
      status: 'OVERDUE' as const,
      paymentTerms: 'Net 15 Days',
      paymentMethod: 'Telegraphic Wire Transfer',
      notes: 'Payment overdue by 7 days. Urgent reminder sent to Finance department of Fresh Valley SG.',
      items: [
        {
          description: 'Nagpur Sweet Mandarin Oranges (Grade-A Export)',
          hsnCode: '08051000',
          quantity: 1300,
          unit: 'CRATE',
          rate: 1600,
          amount: 2080000,
        },
      ],
    },
  ];

  for (const invData of sampleInvoices) {
    const { items, ...invHeader } = invData;
    await prisma.invoice.create({
      data: {
        ...invHeader,
        items: {
          create: items,
        },
      },
    });
  }

  console.log(`✅ Successfully seeded ${sampleInvoices.length} invoices!`);
}

seedInvoices()
  .catch((e) => {
    console.error('❌ Seeding invoices error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
