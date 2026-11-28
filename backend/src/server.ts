import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { ensureAccountantSeed } from './utils/initAccountant.js';
import { ensureAdminUser, healAllPendingDues } from './utils/ensureAdminUser.js';
import { cleanupDummyOrders } from './utils/cleanupDummy.js';
import { ensureDefaultVendor } from './utils/ensureVendorSeed.js';
import { ensureFieldDataSeed } from './utils/initFieldData.js';
import { ensureAttendancePolicyAndWorkplaces } from './utils/initAttendanceConfig.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 SAFAL APP Backend Server running on port ${PORT}`);
  console.log(`🌐 API ready at http://0.0.0.0:${PORT}/api`);
  try {
    await ensureAdminUser();
    await healAllPendingDues();
    await ensureAccountantSeed();
    await ensureFieldDataSeed();
    await ensureAttendancePolicyAndWorkplaces();
    await cleanupDummyOrders();
    if (process.env.SEED_DEFAULT_VENDOR === 'true') {
      await ensureDefaultVendor();
    }
  } catch (err) {
    console.error('Error during startup tasks:', err);
  }
});

