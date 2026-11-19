import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';

function getScopedNotificationWhere(userId?: string, role?: string) {
  if (role === 'EMPLOYEE') {
    // Employees ONLY see notifications directed to their specific userId,
    // or broadcast notices sent by Admin/Accountant specifically to all employees or all company.
    // They NEVER see notifications of other employees' POs, expenses, or personal alerts.
    return {
      OR: [
        { userId: userId || '__none__' },
        { recipientRole: 'EMPLOYEE', userId: null },
        { recipientRole: 'ALL', userId: null },
      ],
    };
  }

  if (role === 'ACCOUNTANT') {
    // Accountants see personal notifications, accountant alerts, or broadcast announcements
    return {
      OR: [
        { userId: userId || '__none__' },
        { recipientRole: 'ACCOUNTANT' },
        { recipientRole: 'ALL' },
      ],
    };
  }

  // Admin sees admin alerts, personal notices, or company announcements
  return {
    OR: [
      { userId: userId || '__none__' },
      { recipientRole: 'ADMIN' },
      { recipientRole: 'ALL' },
    ],
  };
}

export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const where = getScopedNotificationWhere(userId, role);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.notification.count({
        where: {
          ...where,
          isRead: false,
        },
      }),
    ]);

    return res.json({
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function markAsRead(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return res.json({ message: 'Notification marked as read' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update notification' });
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const baseWhere = getScopedNotificationWhere(userId, role);

    await prisma.notification.updateMany({
      where: {
        ...baseWhere,
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    return res.status(500).json({ error: 'Failed to update notifications' });
  }
}

export async function sendNotification(req: AuthRequest, res: Response) {
  try {
    const sender = req.user;
    if (!sender || (sender.role !== 'ADMIN' && sender.role !== 'ACCOUNTANT')) {
      return res.status(403).json({ error: 'Only Admin and Accountant can send notices' });
    }

    const { target, targetUserId, title, message, type = 'INFO' } = req.body;

    if (!title || !String(title).trim() || !message || !String(message).trim()) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const senderRole = sender.role === 'ADMIN' ? 'Admin' : 'Accountant';
    const trimmedTitle = String(title).trim();
    const formattedTitle = `[Notice from ${senderRole}] ${trimmedTitle}`;
    const trimmedMessage = String(message).trim();

    if (target === 'USER') {
      if (!targetUserId) {
        return res.status(400).json({ error: 'Target employee is required' });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
      });

      if (!targetUser) {
        return res.status(404).json({ error: 'Target recipient not found' });
      }

      const notification = await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: formattedTitle,
          message: trimmedMessage,
          type: type || 'INFO',
        },
      });

      await createAuditLog({
        userId: sender.id,
        userName: sender.name,
        userRole: sender.role,
        action: 'NOTICE_SENT',
        entityType: 'NOTIFICATION',
        entityId: notification.id,
        details: `Direct notice sent to ${targetUser.name} (${targetUser.email}): "${trimmedTitle}"`,
        ipAddress: req.ip,
      });

      return res.status(201).json({
        message: `Notice sent to ${targetUser.name} successfully`,
        notification,
      });
    }

    // Target is 'EMPLOYEES' or 'ALL'
    const recipientRole = target === 'EMPLOYEES' ? 'EMPLOYEE' : 'ALL';

    const notification = await prisma.notification.create({
      data: {
        recipientRole,
        userId: null,
        title: formattedTitle,
        message: trimmedMessage,
        type: type || 'INFO',
      },
    });

    await createAuditLog({
      userId: sender.id,
      userName: sender.name,
      userRole: sender.role,
      action: 'BROADCAST_NOTICE_SENT',
      entityType: 'NOTIFICATION',
      entityId: notification.id,
      details: `Broadcast notice sent to ${recipientRole === 'EMPLOYEE' ? 'all employees' : 'everyone'} by ${sender.name}: "${trimmedTitle}"`,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      message: `Broadcast notice sent to ${recipientRole === 'EMPLOYEE' ? 'all employees' : 'all staff'} successfully`,
      notification,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: 'Failed to send notification' });
  }
}
