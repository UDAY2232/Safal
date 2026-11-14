import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 SAFAL APP Backend Server running on port ${PORT}`);
  console.log(`🌐 API ready at http://localhost:${PORT}/api`);
});

