import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

export async function cleanAllMockData() {
  console.log('🧹 Purging all mock data from SAFAL database...');

  // 1. Delete dependent transactional and financial records in reverse order
  await prisma.invoiceItem.deleteMany();
  await prisma.invoice.deleteMany();

  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();

  await prisma.wagePayment.deleteMany();
  await prisma.employeeWageRecord.deleteMany();

  await prisma.expensePayment.deleteMany();
  await prisma.expenseClaim.deleteMany();

  await prisma.purchaseOrderFinancialRecord.deleteMany();
  await prisma.purchaseOrderStatusHistory.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();

  await prisma.supplier.deleteMany();
  await prisma.accountantProfile.deleteMany();
  await prisma.employee.deleteMany();

  // 2. Delete all users except Master Admin
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'safelexportandimportpvtltd@gmail.com',
      },
    },
  });

  // 3. Ensure Master Admin account exists and is pristine
  const adminPasswordHash = await bcrypt.hash('shenkar@palthya', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'safelexportandimportpvtltd@gmail.com' },
    update: {
      name: 'Shanker',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      department: 'Executive Management',
      designation: 'Managing Director & Founder',
      phone: '+91 98765 43210',
      isActive: true,
    },
    create: {
      name: 'Shanker',
      email: 'safelexportandimportpvtltd@gmail.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      department: 'Executive Management',
      designation: 'Managing Director & Founder',
      phone: '+91 98765 43210',
      isActive: true,
    },
  });

  // 4. Reset Application Settings to clean official values
  await prisma.applicationSetting.deleteMany();
  const settings = [
    { key: 'COMPANY_NAME', value: 'SAFAL EXPORT AND IMPORT PVT LTD', category: 'COMPANY' },
    { key: 'COMPANY_SHORT_NAME', value: 'SAFAL', category: 'COMPANY' },
    { key: 'COMPANY_TAGLINE', value: 'Fruits Import & Export - Freshness Beyond Borders', category: 'COMPANY' },
    { key: 'COMPANY_EMAIL', value: 'safelexportandimportpvtltd@gmail.com', category: 'COMPANY' },
    { key: 'COMPANY_PHONE', value: '+91 98765 43210', category: 'COMPANY' },
    { key: 'COMPANY_ADDRESS', value: 'APMC Market, Sector 19, Vashi, Navi Mumbai, Maharashtra 400703', category: 'COMPANY' },
    { key: 'COMPANY_GSTIN', value: '27AABCS1234F1Z5', category: 'TAX' },
    { key: 'COMPANY_PAN', value: 'AABCS1234F', category: 'TAX' },
    { key: 'COMPANY_IEC', value: '0308012345', category: 'EXPORT' },
    { key: 'CURRENCY', value: 'INR (₹)', category: 'FINANCE' },
    { key: 'FINANCIAL_YEAR', value: '2026-2027', category: 'FINANCE' },
  ];

  for (const s of settings) {
    await prisma.applicationSetting.create({ data: s });
  }

  // 5. Create 1 clean initial audit log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      userName: admin.name,
      userRole: 'ADMIN',
      action: 'SYSTEM_INITIALIZED',
      entityType: 'SYSTEM',
      details: 'SAFAL Enterprise ERP initialized. Database cleared to clean production state.',
    },
  });

  console.log('✅ ALL MOCK DATA PURGED! Fresh clean state initialized.');
  console.log('--------------------------------------------------');
  console.log('Master Administrator:');
  console.log('Name:     Shanker');
  console.log('Email:    safelexportandimportpvtltd@gmail.com');
  console.log('Password: shenkar@palthya');
  console.log('Database Status:');
  console.log('- Purchase Orders: 0 (Fresh)');
  console.log('- Invoices:        0 (Fresh)');
  console.log('- Expenses:        0 (Fresh)');
  console.log('- Wages:           0 (Fresh)');
  console.log('- Suppliers:       0 (Fresh)');
  console.log('- Employees:       0 (Fresh)');
  console.log('- Accountants:     0 (Fresh)');
  console.log('--------------------------------------------------');
}

cleanAllMockData()
  .catch((e) => {
    console.error('Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
