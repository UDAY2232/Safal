import { prisma } from '../config/db.js';

export interface AuditParams {
  userId?: string | null;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}

export async function createAuditLog(params: AuditParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        userName: params.userName,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Audit log failure:', error);
  }
}

