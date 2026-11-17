import express from 'express';
import cors from 'cors';
import path from 'path';
import { prisma } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import wageRoutes from './routes/wageRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import clearanceRoutes from './routes/clearanceRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';

export const app = express();

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded receipts & docs
const uploadDir = path.resolve('uploads');
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    appName: 'SAFAL APP',
    company: 'SAFAL EXPORT AND IMPORT PVT LTD',
    timestamp: new Date().toISOString(),
  });
});

// Live Database & System Status
app.get('/api/system/status', async (_req, res) => {
  try {
    const [poCount, empCount, supCount, expCount, wageCount, userCount] = await Promise.all([
      prisma.purchaseOrder.count(),
      prisma.employee.count(),
      prisma.supplier.count(),
      prisma.expenseClaim.count(),
      prisma.employeeWageRecord.count(),
      prisma.user.count(),
    ]);

    let dbHost = 'localhost';
    let dbName = 'safal_db';
    let dbEngine = 'PostgreSQL';

    if (process.env.DATABASE_URL) {
      try {
        const parsed = new URL(process.env.DATABASE_URL);
        dbHost = parsed.hostname;
        dbName = parsed.pathname.replace(/^\//, '') || 'safal_db';
        if (dbHost.includes('neon.tech')) {
          dbEngine = 'Neon Serverless PostgreSQL (Cloud)';
        }
      } catch {}
    }

    res.json({
      status: 'CONNECTED',
      engine: dbEngine,
      database: dbName,
      host: dbHost,
      tables: 15,
      records: {
        purchaseOrders: poCount,
        employees: empCount,
        suppliers: supCount,
        expenseClaims: expCount,
        wageRecords: wageCount,
        users: userCount,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// Modular Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/wages', wageRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/clearance', clearanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/invoices', invoiceRoutes);

