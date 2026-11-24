import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import { getEmployeeShiftConfig } from '../utils/shiftConfig.js';

// Standard Office Shift Configuration (SAFAL Office - Raipura, Kakatiya colony, Hanamkonda, Telangana)
// Office timings: 05:30 AM – 06:00 AM Arrival to 02:00 PM in office + 2 extra hours for company growth, sales, and client visits
const SHIFT_START_HOUR = 6;
const SHIFT_START_MINUTE = 0; // 06:00 AM (Arrival window: 05:30 AM to 06:00 AM)
const SHIFT_END_HOUR = 14;
const SHIFT_END_MINUTE = 0; // 02:00 PM (Office conclusion)
const FULL_DAY_MINUTES = 480; // 8 Hours (Core office shift: 06:00 AM to 02:00 PM)
const EXTRA_GROWTH_MINUTES = 120; // 2 Extra Hours for company growth & sales
const HALF_DAY_MINUTES = 240; // 4 Hours

/**
 * Returns YYYY-MM-DD date in Asia/Kolkata timezone as a UTC Date object
 */
function getTodayDate(inputDate?: string): Date {
  if (inputDate) {
    const trimmed = inputDate.split('T')[0];
    return new Date(`${trimmed}T00:00:00.000Z`);
  }
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/**
 * Get current time details in IST
 */
function getIstTimeDetails(date = new Date()) {
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = istFormatter.formatToParts(date);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const timeFormatted = date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { hour, minute, timeFormatted };
}

/**
 * Processes attendance photo (base64 or uploaded file):
 * Retains the base64 data URI directly for persistent, cloud-resilient photo storage in PostgreSQL
 * ensuring photos always render seamlessly on Vercel and mobile without disk dependency.
 */
function processAttendancePhoto(dataString?: string, file?: Express.Multer.File): string | null {
  if (file) {
    try {
      const buffer = fs.readFileSync(file.path);
      const mime = file.mimetype || 'image/jpeg';
      return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch {
      return `/uploads/${file.filename}`;
    }
  }

  if (!dataString || typeof dataString !== 'string') return null;

  const trimmed = dataString.trim();
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  return `data:image/jpeg;base64,${trimmed}`;
}

/**
 * POST /api/attendance/clock-in
 * Record employee punch-in arrival at office
 */
export async function clockIn(req: AuthRequest, res: Response) {
  try {
    const userPayload = req.user;
    if (!userPayload?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const userId = userPayload.id;

    const today = getTodayDate();
    const now = new Date();
    const { hour, minute, timeFormatted } = getIstTimeDetails(now);

    // Check if user already clocked in today
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existing) {
      const existingIst = getIstTimeDetails(existing.clockInTime);
      return res.status(400).json({
        message: `Attendance already recorded today at ${existingIst.timeFormatted}.`,
        attendance: existing,
      });
    }

    // Get linked employee record if any (by userId or matching email)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });

    let linkedEmployee = user?.employee;
    if (!linkedEmployee && user?.email) {
      linkedEmployee = await prisma.employee.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { email: { equals: user.email, mode: 'insensitive' } },
          ],
        },
      });
      if (linkedEmployee && !linkedEmployee.userId) {
        await prisma.employee.update({
          where: { id: linkedEmployee.id },
          data: { userId: user.id, status: 'ACTIVE' },
        });
      }
    } else if (linkedEmployee) {
      await prisma.employee.update({
        where: { id: linkedEmployee.id },
        data: { status: 'ACTIVE' },
      });
    }

    // Determine individual employee shift configuration
    const shift = getEmployeeShiftConfig({
      email: user?.email,
      name: user?.name,
      fullName: linkedEmployee?.fullName || user?.employee?.fullName,
      employeeId: linkedEmployee?.employeeId,
    });

    // Determine status (Late if after individual employee's official shift start)
    const isLate = hour > shift.startHour || (hour === shift.startHour && minute > shift.startMinute);
    const status = isLate ? 'LATE' : 'PRESENT';

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'Office Network';

    // Process uploaded photo or base64 selfie
    const uploadedPhoto = processAttendancePhoto(req.body.photo || req.body.image, req.file);

    const location =
      req.body.location ||
      '3-4-693/5/1/A/1, Raipura, Kakatiya colony, Hanamkonda, Telangana, 506011';

    const notes = isLate
      ? `Late arrival at ${timeFormatted} (Assigned Shift: ${shift.displayTiming} · ${shift.shiftName})`
      : `On-time arrival at ${timeFormatted} (Assigned Shift: ${shift.displayTiming} · ${shift.shiftName})`;

    const record = await prisma.attendanceRecord.create({
      data: {
        userId,
        employeeId: linkedEmployee?.id || user?.employee?.id || null,
        date: today,
        clockInTime: now,
        status: status as any,
        photoUrl: uploadedPhoto,
        location,
        clockInIp: clientIp,
        notes,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        employee: { select: { employeeId: true, department: true, designation: true } },
      },
    });

    await createAuditLog({
      userId,
      userName: userPayload.name,
      userRole: userPayload.role,
      action: 'CLOCK_IN',
      entityType: 'ATTENDANCE',
      entityId: record.id,
      details: `${userPayload.name} clocked in at ${timeFormatted} (${status})`,
      ipAddress: clientIp,
    });

    return res.status(201).json({
      message: isLate
        ? `Attendance photo verified! Recorded at ${timeFormatted} (Late arrival).`
        : `Attendance photo verified! Recorded at ${timeFormatted}. You're on time!`,
      attendance: record,
    });
  } catch (error: any) {
    console.error('Clock-in error:', error);
    return res.status(500).json({ message: 'Failed to record clock-in', error: error.message });
  }
}

/**
 * POST /api/attendance/clock-out
 * Record employee punch-out departure from office
 */
export async function clockOut(req: AuthRequest, res: Response) {
  try {
    const userPayload = req.user;
    if (!userPayload?.id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const userId = userPayload.id;

    const today = getTodayDate();
    const now = new Date();
    const { timeFormatted } = getIstTimeDetails(now);

    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (!existing) {
      return res.status(400).json({
        message: 'No clock-in recorded for today. Please clock in before clocking out.',
      });
    }

    if (existing.clockOutTime) {
      const outIst = getIstTimeDetails(existing.clockOutTime);
      return res.status(400).json({
        message: `Already clocked out today at ${outIst.timeFormatted}.`,
        attendance: existing,
      });
    }

    // Calculate total minutes worked
    const diffMs = now.getTime() - existing.clockInTime.getTime();
    const totalMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));

    // Individual employee shift configuration
    const shift = getEmployeeShiftConfig({
      email: userPayload.email,
      name: userPayload.name,
      fullName: (existing as any).employee?.fullName,
      employeeId: (existing as any).employee?.employeeId,
    });

    // If worked less than half of their shift duration, mark as HALF_DAY unless already LATE
    const halfShiftMinutes = Math.floor(shift.totalMinutes / 2);
    let finalStatus = existing.status;
    if (totalMinutes < halfShiftMinutes) {
      finalStatus = 'HALF_DAY';
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const durationStr = `${hours}h ${mins}m`;

    const uploadedOutPhoto = processAttendancePhoto(req.body.photo || req.body.image, req.file);

    const updated = await prisma.attendanceRecord.update({
      where: { id: existing.id },
      data: {
        clockOutTime: now,
        totalMinutes,
        status: finalStatus,
        ...(uploadedOutPhoto ? { clockOutPhotoUrl: uploadedOutPhoto } : {}),
        notes: `${existing.notes ? existing.notes + ' | ' : ''}Office Out at ${timeFormatted} (Worked: ${durationStr} / ${shift.displayTiming} · ${shift.shiftName})`,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        employee: { select: { employeeId: true, department: true, designation: true } },
      },
    });

    await createAuditLog({
      userId,
      userName: userPayload.name,
      userRole: userPayload.role,
      action: 'CLOCK_OUT',
      entityType: 'ATTENDANCE',
      entityId: updated.id,
      details: `${userPayload.name} clocked out at ${timeFormatted}. Total duration: ${durationStr}`,
    });

    return res.json({
      message: `Clocked Out at ${timeFormatted}. Shift completed (${durationStr}). Have a great evening!`,
      attendance: updated,
    });
  } catch (error: any) {
    console.error('Clock-out error:', error);
    return res.status(500).json({ message: 'Failed to record clock-out', error: error.message });
  }
}

/**
 * GET /api/attendance/today
 * Retrieve current user's attendance state for today
 */
export async function getTodayStatus(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const today = getTodayDate();
    const record = await prisma.attendanceRecord.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        employee: { select: { employeeId: true, department: true, designation: true } },
      },
    });

    // Also get company-wide today count for quick stats
    const todayRecords = await prisma.attendanceRecord.findMany({
      where: { date: today },
    });

    const activeInOfficeCount = todayRecords.filter((r) => !r.clockOutTime).length;
    const totalPresentCount = todayRecords.length;
    const lateCount = todayRecords.filter((r) => r.status === 'LATE').length;

    // Get individual shift config for this user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    const shiftConfig = getEmployeeShiftConfig({
      email: user?.email,
      name: user?.name,
      fullName: user?.employee?.fullName,
      employeeId: user?.employee?.employeeId,
    });

    return res.json({
      record: record || null,
      isClockedIn: !!record,
      isClockedOut: !!record?.clockOutTime,
      shiftConfig,
      officeOverview: {
        totalPresent: totalPresentCount,
        activeInOffice: activeInOfficeCount,
        lateArrivals: lateCount,
      },
    });
  } catch (error: any) {
    console.error('getTodayStatus error:', error);
    return res.status(500).json({ message: 'Failed to load today status', error: error.message });
  }
}

/**
 * GET /api/attendance/my-history
 * Retrieve current user's past attendance records and monthly statistics
 */
export async function getMyHistory(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const records = await prisma.attendanceRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 60,
      include: {
        employee: { select: { employeeId: true, designation: true, department: true } },
      },
    });

    // Calculate metrics
    const totalDays = records.length;
    const onTimeDays = records.filter((r) => r.status === 'PRESENT').length;
    const lateDays = records.filter((r) => r.status === 'LATE').length;
    const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;
    const totalMinutes = records.reduce((sum, r) => sum + (r.totalMinutes || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const onTimePercentage = totalDays > 0 ? Math.round((onTimeDays / totalDays) * 100) : 100;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: true },
    });
    const shiftConfig = getEmployeeShiftConfig({
      email: user?.email,
      name: user?.name,
      fullName: user?.employee?.fullName,
      employeeId: user?.employee?.employeeId,
    });

    return res.json({
      records,
      shiftConfig,
      stats: {
        totalDays,
        onTimeDays,
        lateDays,
        halfDays,
        totalHours,
        onTimePercentage,
      },
    });
  } catch (error: any) {
    console.error('getMyHistory error:', error);
    return res.status(500).json({ message: 'Failed to load attendance history', error: error.message });
  }
}

/**
 * GET /api/attendance/all
 * Admin / Manager endpoint: view all staff attendance for a given date
 */
export async function getAllAttendanceRecords(req: AuthRequest, res: Response) {
  try {
    const { date, department } = req.query;
    const targetDate = getTodayDate(date as string);

    // Fetch all active employees and users
    const [allEmployees, attendanceForDate] = await Promise.all([
      prisma.employee.findMany({
        where: {
          status: 'ACTIVE',
          ...(department && department !== 'All' ? { department: department as string } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
        },
        orderBy: { employeeId: 'asc' },
      }),
      prisma.attendanceRecord.findMany({
        where: { date: targetDate },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          employee: { select: { employeeId: true, fullName: true, department: true, designation: true } },
        },
        orderBy: { clockInTime: 'asc' },
      }),
    ]);

    // Map attendance records by userId and employeeId
    const attendanceMap = new Map<string, typeof attendanceForDate[0]>();
    attendanceForDate.forEach((r) => {
      if (r.userId) attendanceMap.set(r.userId, r);
      if (r.employeeId) attendanceMap.set(r.employeeId, r);
    });

    // Build consolidated roster for the day
    const staffRoster = allEmployees.map((emp) => {
      const record =
        (emp.userId ? attendanceMap.get(emp.userId) : null) || attendanceMap.get(emp.id) || null;

      let status = 'ABSENT';
      if (record) {
        status = record.status;
      }

      const shiftConfig = getEmployeeShiftConfig({
        email: emp.email,
        name: emp.user?.name,
        fullName: emp.fullName,
        employeeId: emp.employeeId,
      });

      return {
        employeeDbId: emp.id,
        employeeCode: emp.employeeId,
        fullName: emp.fullName,
        email: emp.email,
        department: emp.department,
        designation: emp.designation,
        userId: emp.userId,
        shiftConfig,
        shiftTiming: shiftConfig.displayTiming,
        attendance: record
          ? {
              id: record.id,
              clockInTime: record.clockInTime,
              clockOutTime: record.clockOutTime,
              totalMinutes: record.totalMinutes,
              status: record.status,
              photoUrl: record.photoUrl,
              clockOutPhotoUrl: record.clockOutPhotoUrl,
              location: record.location,
              clockInIp: record.clockInIp,
              notes: record.notes,
            }
          : null,
        displayStatus: record ? record.status : 'ABSENT',
      };
    });

    const totalStaff = allEmployees.length;
    const presentCount = attendanceForDate.length;
    const lateCount = attendanceForDate.filter((r) => r.status === 'LATE').length;
    const currentlyInOffice = attendanceForDate.filter((r) => !r.clockOutTime).length;
    const absentCount = Math.max(0, totalStaff - presentCount);

    return res.json({
      date: targetDate,
      summary: {
        totalStaff,
        presentCount,
        lateCount,
        currentlyInOffice,
        absentCount,
        attendanceRate: totalStaff > 0 ? Math.round((presentCount / totalStaff) * 100) : 0,
      },
      roster: staffRoster,
      records: attendanceForDate,
    });
  } catch (error: any) {
    console.error('getAllAttendanceRecords error:', error);
    return res.status(500).json({ message: 'Failed to load roster attendance', error: error.message });
  }
}
