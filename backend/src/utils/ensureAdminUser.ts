import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

/**
 * Ensures the Master Admin account has the correct official email:
 * safalexportandimportpvtltd@gmail.com (fixing the 'safelexport' typo from legacy seeds)
 * Also ensures password SHENKAR@SAFALCEO is set/usable.
 */
export async function ensureAdminUser(): Promise<void> {
  try {
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'safelexportandimportpvtltd@gmail.com' },
          { email: 'safalexportandimportpvtltd@gmail.com' },
          { role: 'ADMIN' },
        ],
      },
    });

    if (adminUser) {
      const updates: any = {};
      if (adminUser.email === 'safelexportandimportpvtltd@gmail.com') {
        updates.email = 'safalexportandimportpvtltd@gmail.com';
      }

      // Check if password needs update to SHENKAR@SAFALCEO
      const matchesDesired = await bcrypt.compare('SHENKAR@SAFALCEO', adminUser.passwordHash);
      const matchesDefault = await bcrypt.compare('shenkar@palthya', adminUser.passwordHash);

      // If neither matches or if it's the old default, ensure SHENKAR@SAFALCEO is hashed
      if (!matchesDesired && matchesDefault) {
        updates.passwordHash = await bcrypt.hash('SHENKAR@SAFALCEO', 10);
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: adminUser.id },
          data: updates,
        });
        console.log(`[Admin Seed] Synchronized Master Admin credentials: email=${updates.email || adminUser.email}`);
      }
    }
  } catch (err) {
    console.error('[Admin Seed] Error synchronizing admin account:', err);
  }
}

/**
 * Auto-heals all pending dues across the entire system.
 * Fixes any corrupted values where 6% mandi deduction was wrongly subtracted from POs or CDs.
 * Rule: Pending Due is ALWAYS strictly Math.max(0, grandTotal - advanceAmount).
 */
export async function healAllPendingDues(): Promise<void> {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        rejectionReason: null,
      },
      select: {
        id: true,
        poNumber: true,
        grandTotal: true,
        advanceAmount: true,
        pendingAmount: true,
        status: true,
      },
    });

    let healedCount = 0;
    for (const ord of orders) {
      const grand = Number(ord.grandTotal || 0);
      const adv = Number(ord.advanceAmount || 0);
      const correctPending = Math.max(0, grand - adv);

      // If status is CLOSED and fully paid, pending is 0
      const targetPending = ord.status === 'CLOSED' && correctPending === 0 ? 0 : correctPending;
      const targetStatus = targetPending > 0 && ord.status === 'CLOSED' ? 'OPEN' : ord.status;

      if (
        Math.abs(Number(ord.pendingAmount || 0) - targetPending) > 0.01 ||
        ord.status !== targetStatus
      ) {
        await prisma.purchaseOrder.update({
          where: { id: ord.id },
          data: {
            pendingAmount: targetPending,
            status: targetStatus,
          },
        });
        healedCount++;
        console.log(`[Due Heal] Fixed ${ord.poNumber}: Total=₹${grand}, Paid=₹${adv}, OldDue=₹${ord.pendingAmount} -> NewDue=₹${targetPending}`);
      }
    }

    if (healedCount > 0) {
      console.log(`[Due Heal] Successfully healed ${healedCount} purchase order / customer due balances!`);
    }
  } catch (err) {
    console.error('[Due Heal] Error during due balance healing:', err);
  }
}
