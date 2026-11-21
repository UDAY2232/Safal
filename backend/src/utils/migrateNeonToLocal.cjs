const { PrismaClient } = require('@prisma/client');

// Load environment variables if .env exists
try {
  require('dotenv').config({ path: '/etc/safal/app.env' });
} catch (e) {}
try {
  require('dotenv').config();
} catch (e) {}

const neonUrl =
  process.env.NEON_DATABASE_URL ||
  'postgresql://neondb_owner:npg_uintyK3pj5mx@ep-cool-bird-azwgz85i-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const localUrl =
  process.env.TARGET_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://safal_user:SafalDb@2026@localhost:5432/safal_db?schema=public';

const source = new PrismaClient({
  datasources: { db: { url: neonUrl } },
});

const target = new PrismaClient({
  datasources: { db: { url: localUrl } },
});

async function migrate() {
  console.log('🚀 Starting Data Migration: Neon Cloud DB -> Local Namecheap PostgreSQL');
  console.log('📡 Source (Neon):', neonUrl.replace(/:[^:]*@/, ':***@'));
  console.log('💾 Target (Local):', localUrl.replace(/:[^:]*@/, ':***@'));

  try {
    // 1. Users
    const users = await source.user.findMany();
    console.log(`\n📦 Migrating Users (${users.length})...`);
    for (const u of users) {
      await target.user.upsert({ where: { id: u.id }, update: u, create: u });
    }
    console.log(`✅ ${users.length} Users migrated.`);

    // 2. Accountant Profiles
    const accountants = await source.accountantProfile.findMany();
    console.log(`📦 Migrating Accountant Profiles (${accountants.length})...`);
    for (const a of accountants) {
      await target.accountantProfile.upsert({ where: { id: a.id }, update: a, create: a });
    }
    console.log(`✅ ${accountants.length} Accountant profiles migrated.`);

    // 3. Employees
    const employees = await source.employee.findMany();
    console.log(`📦 Migrating Employees (${employees.length})...`);
    for (const e of employees) {
      await target.employee.upsert({ where: { id: e.id }, update: e, create: e });
    }
    console.log(`✅ ${employees.length} Employees migrated.`);

    // 4. Suppliers
    const suppliers = await source.supplier.findMany();
    console.log(`📦 Migrating Suppliers (${suppliers.length})...`);
    for (const s of suppliers) {
      await target.supplier.upsert({ where: { id: s.id }, update: s, create: s });
    }
    console.log(`✅ ${suppliers.length} Suppliers migrated.`);

    // 5. Purchase Orders / Customer Dues
    const pos = await source.purchaseOrder.findMany();
    console.log(`📦 Migrating Purchase Orders & CDs (${pos.length})...`);
    for (const p of pos) {
      await target.purchaseOrder.upsert({ where: { id: p.id }, update: p, create: p });
    }
    console.log(`✅ ${pos.length} Orders & Customer Dues migrated.`);

    // 6. PO Items
    const poItems = await source.purchaseOrderItem.findMany();
    console.log(`📦 Migrating PO Items (${poItems.length})...`);
    for (const item of poItems) {
      await target.purchaseOrderItem.upsert({ where: { id: item.id }, update: item, create: item });
    }
    console.log(`✅ ${poItems.length} PO items migrated.`);

    // 7. PO Status History
    const histories = await source.purchaseOrderStatusHistory.findMany();
    console.log(`📦 Migrating Status History (${histories.length})...`);
    for (const h of histories) {
      await target.purchaseOrderStatusHistory.upsert({ where: { id: h.id }, update: h, create: h });
    }
    console.log(`✅ ${histories.length} Status history logs migrated.`);

    // 8. Financial Records
    const financials = await source.purchaseOrderFinancialRecord.findMany();
    console.log(`📦 Migrating Financial Records (${financials.length})...`);
    for (const f of financials) {
      await target.purchaseOrderFinancialRecord.upsert({ where: { id: f.id }, update: f, create: f });
    }
    console.log(`✅ ${financials.length} Financial records migrated.`);

    // 9. Employee Wage Records
    const wages = await source.employeeWageRecord.findMany();
    console.log(`📦 Migrating Wage Records (${wages.length})...`);
    for (const w of wages) {
      await target.employeeWageRecord.upsert({ where: { id: w.id }, update: w, create: w });
    }
    console.log(`✅ ${wages.length} Wage records migrated.`);

    // 10. Wage Payments
    const wagePayments = await source.wagePayment.findMany();
    console.log(`📦 Migrating Wage Payments (${wagePayments.length})...`);
    for (const wp of wagePayments) {
      await target.wagePayment.upsert({ where: { id: wp.id }, update: wp, create: wp });
    }
    console.log(`✅ ${wagePayments.length} Wage payments migrated.`);

    // 11. Expense Claims
    const expenses = await source.expenseClaim.findMany();
    console.log(`📦 Migrating Expense Claims (${expenses.length})...`);
    for (const ec of expenses) {
      await target.expenseClaim.upsert({ where: { id: ec.id }, update: ec, create: ec });
    }
    console.log(`✅ ${expenses.length} Expense claims migrated.`);

    // 12. Expense Payments
    const expensePayments = await source.expensePayment.findMany();
    console.log(`📦 Migrating Expense Payments (${expensePayments.length})...`);
    for (const ep of expensePayments) {
      await target.expensePayment.upsert({ where: { id: ep.id }, update: ep, create: ep });
    }
    console.log(`✅ ${expensePayments.length} Expense payments migrated.`);

    // 13. Attendance Records
    const attendances = await source.attendanceRecord.findMany();
    console.log(`📦 Migrating Attendance Records (${attendances.length})...`);
    for (const att of attendances) {
      await target.attendanceRecord.upsert({ where: { id: att.id }, update: att, create: att });
    }
    console.log(`✅ ${attendances.length} Attendance records migrated.`);

    // 14. Audit Logs
    const auditLogs = await source.auditLog.findMany();
    console.log(`📦 Migrating Audit Logs (${auditLogs.length})...`);
    for (const al of auditLogs) {
      await target.auditLog.upsert({ where: { id: al.id }, update: al, create: al });
    }
    console.log(`✅ ${auditLogs.length} Audit logs migrated.`);

    // 15. Notifications
    const notifications = await source.notification.findMany();
    console.log(`📦 Migrating Notifications (${notifications.length})...`);
    for (const n of notifications) {
      await target.notification.upsert({ where: { id: n.id }, update: n, create: n });
    }
    console.log(`✅ ${notifications.length} Notifications migrated.`);

    // 16. Application Settings
    const settings = await source.applicationSetting.findMany();
    console.log(`📦 Migrating Settings (${settings.length})...`);
    for (const s of settings) {
      await target.applicationSetting.upsert({ where: { id: s.id }, update: s, create: s });
    }
    console.log(`✅ ${settings.length} Application settings migrated.`);

    // 17. Invoices
    const invoices = await source.invoice.findMany();
    console.log(`📦 Migrating Invoices (${invoices.length})...`);
    for (const inv of invoices) {
      await target.invoice.upsert({ where: { id: inv.id }, update: inv, create: inv });
    }
    console.log(`✅ ${invoices.length} Invoices migrated.`);

    // 18. Invoice Items
    const invoiceItems = await source.invoiceItem.findMany();
    console.log(`📦 Migrating Invoice Items (${invoiceItems.length})...`);
    for (const ii of invoiceItems) {
      await target.invoiceItem.upsert({ where: { id: ii.id }, update: ii, create: ii });
    }
    console.log(`✅ ${invoiceItems.length} Invoice items migrated.`);

    console.log('\n🎉 ==============================================');
    console.log('🎉 SUCCESS: Entire Database Migrated to Namecheap VPS!');
    console.log('🎉 ==============================================');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await source.$disconnect();
    await target.$disconnect();
  }
}

migrate();
