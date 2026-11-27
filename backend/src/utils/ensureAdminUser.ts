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
