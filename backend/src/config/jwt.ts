import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || 'safal_jwt_enterprise_key_fruits_export_import_2026_production';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

