import { Response } from 'express';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';

export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const where: any = {
      OR: [{ userId }, { recipientRole: role }, { recipientRole: 'ALL' }],
    };

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

    await prisma.notification.updateMany({
      where: {
        OR: [{ userId }, { recipientRole: role }, { recipientRole: 'ALL' }],
        isRead: false,
      },
      data: { isRead: true },
    });

    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update notifications' });
  }
}

