import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { ensureAccountantSeed } from './utils/initAccountant.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 SAFAL APP Backend Server running on port ${PORT}`);
  console.log(`🌐 API ready at http://0.0.0.0:${PORT}/api`);
  try {
    await ensureAccountantSeed();
  } catch (err) {
    console.error('Error during startup accountant seed:', err);
  }
});

