import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SAFAL APP Backend Server running on port ${PORT}`);
  console.log(`🌐 API ready at http://0.0.0.0:${PORT}/api`);
});

