import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

const defaultSettings: Record<string, any> = {
  companyName: 'SAFAL EXPORT AND IMPORT PVT LTD',
  applicationName: 'SAFAL APP',
  businessType: 'Fruits Import & Export',
  currency: 'INR (₹)',
  timezone: 'Asia/Kolkata (IST)',
  poNumberPrefix: 'PO/SF',
  poApprovalRequired: true,
  expenseMaxNoReceipt: 500,
  expenseCategories: [
    'Official Travel',
    'Fuel & Transportation',
    'Food & Refreshments',
    'Accommodation',
    'Client Meetings',
    'Loading & Unloading',
    'Office Supplies',
    'Packaging Material',
    'Miscellaneous',
  ],
  departments: ['Procurement', 'Finance & Accounts', 'Logistics & Supply', 'Operations', 'Quality Control'],
  wageTypes: ['Monthly Salary', 'Daily Wages', 'Hourly Wages'],
  fruitProcurementRates: {
    apples: {
      layer4L: 1300,
      layer5L: 1400,
      roll: 600,
    },
    pomegranate: 950,
    watermelon: 14000,
    muskmelon: 18000,
    banana: 550,
    orange: 780,
    plum: 850,
  },
};

export async function getSettings(_req: AuthRequest, res: Response) {
  try {
    const dbSettings = await prisma.applicationSetting.findMany();
    const result: Record<string, any> = { ...defaultSettings };

    dbSettings.forEach((s) => {
      try {
        result[s.key] = JSON.parse(s.value);
      } catch {
        result[s.key] = s.value;
      }
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

export async function updateSettings(req: AuthRequest, res: Response) {
  try {
    const entries = Object.entries(req.body);

    for (const [key, value] of entries) {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      await prisma.applicationSetting.upsert({
        where: { key },
        create: {
          key,
          value: stringValue,
          category: 'APPLICATION',
        },
        update: {
          value: stringValue,
        },
      });
    }

    await createAuditLog({
      userId: req.user?.id,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      details: `Updated settings: ${entries.map(([k]) => k).join(', ')}`,
      ipAddress: req.ip,
    });

    return res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update settings' });
  }
}

