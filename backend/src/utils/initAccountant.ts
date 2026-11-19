import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

/**
 * Initializes or updates the dedicated Accountant account:
 * Email: chirrauday44@gmail.com
 * Password: uday@0211
 * Role: ACCOUNTANT
 * Profile: Full Accountant privileges (PO creation/submit, Expense review, Bill clearance, Suppliers, Reports)
 * Also creates/links an Employee record so Admin sees them in both Accountants and Staff records.
 */
export async function ensureAccountantSeed(): Promise<void> {
  const email = 'chirrauday44@gmail.com'.toLowerCase().trim();
  const rawPassword = 'uday@0211';
  const name = 'Uday Chirra';

  try {
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // 1. Check or Upsert User
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        accountantProfile: true,
        employee: true,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'ACCOUNTANT',
          department: 'Accounts & Finance',
          designation: 'Senior Accountant',
          isActive: true,
        },
        include: {
          accountantProfile: true,
          employee: true,
        },
      });
      console.log(`[Accountant Seed] Created accountant user: ${email} (ID: ${user.id})`);
    } else {
      // Ensure credentials and role are fresh and active
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          role: 'ACCOUNTANT',
          isActive: true,
          designation: 'Senior Accountant',
          department: 'Accounts & Finance',
        },
        include: {
          accountantProfile: true,
          employee: true,
        },
      });
      console.log(`[Accountant Seed] Updated accountant credentials for ${email}`);
    }

    // 2. Ensure AccountantProfile exists with full operational capabilities
    if (!user.accountantProfile) {
      // Check existing accountantId to avoid collisions
      const existingAcc = await prisma.accountantProfile.findUnique({
        where: { accountantId: 'ACC-044' },
      });
      const accountantId = existingAcc ? `ACC-${Date.now().toString().slice(-3)}` : 'ACC-044';

      await prisma.accountantProfile.create({
        data: {
          userId: user.id,
          accountantId,
          canCreatePO: true,
          canSubmitPO: true,
          canReviewExpenses: true,
          canViewWages: true,
          canRecordPayments: true,
          status: 'ACTIVE',
        },
      });
      console.log(`[Accountant Seed] Created AccountantProfile (${accountantId}) for ${email}`);
    } else {
      await prisma.accountantProfile.update({
        where: { id: user.accountantProfile.id },
        data: {
          canCreatePO: true,
          canSubmitPO: true,
          canReviewExpenses: true,
          canViewWages: true,
          canRecordPayments: true,
          status: 'ACTIVE',
        },
      });
      console.log(`[Accountant Seed] Verified AccountantProfile permissions for ${email}`);
    }

    // 3. Ensure Employee record exists so Admin can view and manage under Staff / Personnel
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: user.id },
          { email: { equals: email, mode: 'insensitive' } },
        ],
      },
    });

    if (!existingEmployee) {
      await prisma.employee.create({
        data: {
          employeeId: 'EMP-044',
          userId: user.id,
          fullName: name,
          email,
          phone: '+91 98765 43210',
          department: 'Accounts & Finance',
          designation: 'Senior Accountant',
          wageType: 'MONTHLY',
          baseWageRate: 65000,
          joiningDate: new Date('2026-11-19'),
          status: 'ACTIVE',
        },
      });
      console.log(`[Accountant Seed] Created Employee profile EMP-044 in Admin directory for ${email}`);
    } else {
      await prisma.employee.update({
        where: { id: existingEmployee.id },
        data: {
          userId: user.id,
          fullName: name,
          email,
          department: 'Accounts & Finance',
          designation: 'Senior Accountant',
          status: 'ACTIVE',
        },
      });
      console.log(`[Accountant Seed] Synced Employee profile ${existingEmployee.employeeId} with user`);
    }

    console.log(`[Accountant Seed] Setup complete for ${email} (Password: ${rawPassword})`);
  } catch (error) {
    console.error('[Accountant Seed] Error seeding accountant account:', error);
  }
}
