import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { prisma } from '../config/db.js';
import { AuthRequest } from '../middleware/auth.js';
import { createAuditLog } from '../services/auditService.js';
import { getEmployeeShiftConfig } from '../utils/shiftConfig.js';

/**
 * Returns YYYY-MM-DD date in Asia/Kolkata timezone as a UTC Date object
 */
export function getTodayDate(inputDate?: string): Date {
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
export function getIstTimeDetails(date = new Date()) {
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
 * Calculates distance in meters between two GPS coordinates using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const rad = Math.PI / 180;
  const φ1 = lat1 * rad;
  const φ2 = lat2 * rad;
  const Δφ = (lat2 - lat1) * rad;
  const Δλ = (lon2 - lon1) * rad;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Processes attendance photo (base64 or uploaded file):
 * Retains the base64 data URI directly for persistent, cloud-resilient photo storage in PostgreSQL.
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
 * Record employee punch-in arrival at workplace with GPS geofence verification
 * and automatic late arrival penalty calculation.
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

    // 1. Check if user already clocked in today
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

    // 2. Retrieve linked employee record
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

    // 3. Fetch Attendance Policy Configuration
    let policy = await prisma.attendancePolicyConfig.findFirst();
    if (!policy) {
      policy = await prisma.attendancePolicyConfig.create({
        data: {
          gracePeriodMinutes: 59,
          penaltyPerHourAmount: 100,
          requireGps: true,
          maxAllowedAccuracyMeters: 150,
        },
      });
    }

    // 4. GPS & Geofence Verification
    const rawLat = req.body.latitude ? parseFloat(req.body.latitude) : null;
    const rawLng = req.body.longitude ? parseFloat(req.body.longitude) : null;
    const rawAccuracy = req.body.gpsAccuracyMeters || req.body.accuracy ? parseFloat(req.body.gpsAccuracyMeters || req.body.accuracy) : null;
    const specifiedWorkplaceId = req.body.workplaceLocationId;

    let workplaceLocationId: string | null = null;
    let workplaceName: string = 'SAFAL Head Office & Operations Facility';
    let distanceMeters: number | null = null;
    let locationStatus = 'VERIFIED';

    if (policy.requireGps) {
      if (rawLat === null || rawLng === null || isNaN(rawLat) || isNaN(rawLng)) {
        return res.status(400).json({
          message: 'GPS location is required to verify workplace attendance. Please enable location services on your device.',
        });
      }

      if (rawAccuracy !== null && !isNaN(rawAccuracy) && rawAccuracy > policy.maxAllowedAccuracyMeters) {
        return res.status(400).json({
          message: `GPS signal accuracy too low (±${Math.round(rawAccuracy)}m). Required accuracy is within ±${policy.maxAllowedAccuracyMeters}m. Please ensure GPS/High Accuracy is enabled and retry.`,
        });
      }

      // Query active workplace locations
      const activeWorkplaces = await prisma.workplaceLocation.findMany({
        where: { isActive: true },
      });

      if (activeWorkplaces.length > 0) {
        // Find closest authorized workplace
        let closestWp = activeWorkplaces[0];
        let minDistance = calculateHaversineDistance(
          rawLat,
          rawLng,
          Number(closestWp.latitude),
          Number(closestWp.longitude)
        );

        for (let i = 1; i < activeWorkplaces.length; i++) {
          const wp = activeWorkplaces[i];
          const dist = calculateHaversineDistance(
            rawLat,
            rawLng,
            Number(wp.latitude),
            Number(wp.longitude)
          );
          if (dist < minDistance) {
            minDistance = dist;
            closestWp = wp;
          }
        }

        workplaceLocationId = closestWp.id;
        workplaceName = closestWp.name;
        distanceMeters = minDistance;

        // Verify if within allowed radius
        const allowedRadius = closestWp.allowedRadiusMeters || 100;
        if (minDistance > allowedRadius) {
          locationStatus = 'OUT_OF_BOUNDS';
          return res.status(400).json({
            message: `Attendance rejected: You are ${minDistance} meters away from ${closestWp.name} (Allowed workplace radius: ${allowedRadius}m). Attendance must be recorded at an authorized SAFAL workplace.`,
            details: {
              workplaceName: closestWp.name,
              distanceMeters: minDistance,
              allowedRadiusMeters: allowedRadius,
              latitude: rawLat,
              longitude: rawLng,
            },
          });
        }
      }
    }

    // 5. Determine Individual Employee Shift Configuration & Timing
    const shift = getEmployeeShiftConfig({
      email: user?.email,
      name: user?.name,
      fullName: linkedEmployee?.fullName || user?.employee?.fullName,
      employeeId: linkedEmployee?.employeeId,
    });

    const shiftStartTotalMinutes = shift.startHour * 60 + shift.startMinute;
    const actualArrivalTotalMinutes = hour * 60 + minute;
    const lateMinutes = Math.max(0, actualArrivalTotalMinutes - shiftStartTotalMinutes);

    const isLate = lateMinutes > 0;
    const status = isLate ? 'LATE' : 'PRESENT';

    // 6. Calculate Late Arrival Penalty
    // Rule: Lateness <= gracePeriodMinutes (59 min) => ₹0.
    // >= 60 min (1 hr) => ₹100, +₹100 for each additional completed hour.
    let penaltyAmount = 0;
    if (lateMinutes > policy.gracePeriodMinutes) {
      const completedLateHours = Math.floor(lateMinutes / 60);
      penaltyAmount = completedLateHours * Number(policy.penaltyPerHourAmount);
      if (policy.maxDailyPenalty && penaltyAmount > Number(policy.maxDailyPenalty)) {
        penaltyAmount = Number(policy.maxDailyPenalty);
      }
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'Office Network';

    const uploadedPhoto = processAttendancePhoto(req.body.photo || req.body.image, req.file);
    const locationDisplay =
      req.body.location ||
      (workplaceName ? `${workplaceName} (GPS Verified)` : 'SAFAL Operations Facility, Hanamkonda');

    let notes = isLate
      ? `Late arrival by ${lateMinutes}m at ${timeFormatted} (Assigned Shift: ${shift.displayTiming} · ${shift.shiftName}).`
      : `On-time arrival at ${timeFormatted} (Assigned Shift: ${shift.displayTiming} · ${shift.shiftName}).`;

    if (penaltyAmount > 0) {
      notes += ` Automatic late penalty generated: ₹${penaltyAmount} (${Math.floor(lateMinutes / 60)} completed hours late).`;
    }

    // 7. Create Attendance Record
    const record = await prisma.attendanceRecord.create({
      data: {
        userId,
        employeeId: linkedEmployee?.id || user?.employee?.id || null,
        date: today,
        clockInTime: now,
        status: status as any,
        photoUrl: uploadedPhoto,
        location: locationDisplay,
        clockInIp: clientIp,
        notes,
        // GPS Fields
        latitude: rawLat !== null ? rawLat : undefined,
        longitude: rawLng !== null ? rawLng : undefined,
        gpsAccuracyMeters: rawAccuracy !== null ? rawAccuracy : undefined,
        workplaceLocationId,
        workplaceName,
        distanceMeters,
        locationStatus,
        // Shift & Late Penalty Fields
        assignedShiftName: shift.shiftName,
        shiftStartTime: shift.startTimeFormatted,
        shiftEndTime: shift.endTimeFormatted,
        lateMinutes,
        penaltyAmount,
        penaltyWaived: false,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        employee: { select: { id: true, employeeId: true, fullName: true, department: true, designation: true } },
        workplaceLocation: true,
      },
    });

    // 8. Create Attendance Salary Deduction Record if Penalty Generated
    let deductionRecord = null;
    if (penaltyAmount > 0 && linkedEmployee) {
      const monthYear = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
      deductionRecord = await prisma.attendanceSalaryDeduction.create({
        data: {
          attendanceRecordId: record.id,
          employeeId: linkedEmployee.id,
          date: today,
          lateDurationMinutes: lateMinutes,
          penaltyAmount,
          status: 'PENDING_APPROVAL',
          payPeriodMonthYear: monthYear,
          notes: `Automatic penalty for ${lateMinutes}m late arrival on ${today.toISOString().split('T')[0]} (${Math.floor(lateMinutes / 60)} completed hours × ₹${policy.penaltyPerHourAmount}).`,
        },
      });
    }

    await createAuditLog({
      userId,
      userName: userPayload.name,
      userRole: userPayload.role,
      action: 'CLOCK_IN',
      entityType: 'ATTENDANCE',
      entityId: record.id,
      details: `${userPayload.name} clocked in at ${timeFormatted} (${status}, Late: ${lateMinutes}m, Penalty: ₹${penaltyAmount}, Workplace: ${workplaceName}, Distance: ${distanceMeters ?? 'N/A'}m)`,
      ipAddress: clientIp,
    });

    return res.status(201).json({
      message: isLate
        ? penaltyAmount > 0
          ? `Attendance verified! Late arrival by ${lateMinutes} minutes (${Math.floor(lateMinutes / 60)}h). Late penalty of ₹${penaltyAmount} logged.`
          : `Attendance verified! Late arrival by ${lateMinutes} minutes (within grace period). No penalty applied.`
        : `Attendance verified! Recorded at ${timeFormatted}. You're on time!`,
      attendance: record,
      deduction: deductionRecord,
      shift,
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
      include: {
        employee: true,
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
    if (totalMinutes < halfShiftMinutes && existing.status !== 'LATE') {
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
        employee: { select: { id: true, employeeId: true, fullName: true, department: true, designation: true } },
        workplaceLocation: true,
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
        employee: { select: { id: true, employeeId: true, fullName: true, department: true, designation: true } },
        workplaceLocation: true,
        payrollDeduction: true,
        correctionRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Company-wide today count for quick stats
    const todayRecords = await prisma.attendanceRecord.findMany({
      where: { date: today },
    });

    const activeInOfficeCount = todayRecords.filter((r) => !r.clockOutTime).length;
    const totalPresentCount = todayRecords.length;
    const lateCount = todayRecords.filter((r) => r.status === 'LATE').length;

    // Get user and individual shift config
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

    // Also get active workplaces so client modal knows authorized locations
    const workplaces = await prisma.workplaceLocation.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true, latitude: true, longitude: true, allowedRadiusMeters: true },
    });

    const policy = await prisma.attendancePolicyConfig.findFirst();

    return res.json({
      record: record || null,
      isClockedIn: !!record,
      isClockedOut: !!record?.clockOutTime,
      shiftConfig,
      workplaces,
      policy: policy || {
        gracePeriodMinutes: 59,
        penaltyPerHourAmount: 100,
        requireGps: true,
        maxAllowedAccuracyMeters: 150,
      },
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
      take: 90,
      include: {
        employee: { select: { id: true, employeeId: true, fullName: true, designation: true, department: true } },
        workplaceLocation: true,
        payrollDeduction: true,
        correctionRequests: {
          orderBy: { createdAt: 'desc' },
        },
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

    const totalPenalties = records.reduce((sum, r) => sum + Number(r.penaltyAmount || 0), 0);
    const totalWaivedPenalties = records
      .filter((r) => r.penaltyWaived)
      .reduce((sum, r) => sum + Number(r.penaltyAmount || 0), 0);

    return res.json({
      records,
      metrics: {
        totalDays,
        onTimeDays,
        lateDays,
        halfDays,
        totalHours,
        totalMinutes,
        onTimePercentage,
        totalPenalties,
        totalWaivedPenalties,
        netPenalties: totalPenalties - totalWaivedPenalties,
      },
    });
  } catch (error: any) {
    console.error('getMyHistory error:', error);
    return res.status(500).json({ message: 'Failed to load attendance history', error: error.message });
  }
}

/**
 * GET /api/attendance/summary/employee
 * Dedicated endpoint for Employee Dashboard "Attendance & Salary Deductions" tab:
 * - Attendance summary (working days, present, on-time, late, total late hours)
 * - Salary deduction summary (penalties this month, pending, approved, estimated salary after deductions)
 * - Detailed attendance history with GPS, photos, late penalties, and dispute requests.
 */
export async function getEmployeeAttendanceSummary(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { month } = req.query; // format: "2026-11"
    const now = new Date();
    const currentMonthYear =
      typeof month === 'string' && month.match(/^\d{4}-\d{2}$/)
        ? month
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [yearStr, monthStr] = currentMonthYear.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;

    const startDate = new Date(Date.UTC(year, monthIndex, 1));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    // Get employee details and base wage rate
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: {
          include: {
            wageRecords: {
              where: {
                payPeriod: { contains: currentMonthYear },
              },
            },
          },
        },
      },
    });

    const employee = user?.employee;
    const baseWageRate = employee ? Number(employee.baseWageRate) : 0;
    const shift = getEmployeeShiftConfig({
      email: user?.email,
      name: user?.name,
      fullName: employee?.fullName,
      employeeId: employee?.employeeId,
    });

    // Query attendance records for the selected month
    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
      include: {
        workplaceLocation: true,
        payrollDeduction: true,
        correctionRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Calculate working days in month (excluding Sundays) up to today
    const totalDaysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let totalWorkingDaysInMonth = 0;
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dayOfWeek = new Date(year, monthIndex, d).getDay();
      if (dayOfWeek !== 0) totalWorkingDaysInMonth++; // Not Sunday
    }

    const presentDays = records.length;
    const onTimeArrivals = records.filter((r) => r.status === 'PRESENT').length;
    const lateArrivals = records.filter((r) => r.status === 'LATE').length;
    const halfDays = records.filter((r) => r.status === 'HALF_DAY').length;
    const totalLateMinutes = records.reduce((sum, r) => sum + (r.lateMinutes || 0), 0);
    const totalLateHours = Math.round((totalLateMinutes / 60) * 10) / 10;

    // Deductions calculations
    const deductions = await prisma.attendanceSalaryDeduction.findMany({
      where: {
        employeeId: employee?.id || '',
        payPeriodMonthYear: currentMonthYear,
      },
      include: {
        attendanceRecord: true,
      },
    });

    const totalPenaltyAccrued = deductions.reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
    const approvedDeductions = deductions
      .filter((d) => d.status === 'APPROVED' || d.status === 'APPLIED_TO_PAYROLL')
      .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
    const pendingDeductions = deductions
      .filter((d) => d.status === 'PENDING_APPROVAL')
      .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
    const waivedDeductions = deductions
      .filter((d) => d.status === 'WAIVED')
      .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);

    const estimatedNetSalary = Math.max(0, baseWageRate - approvedDeductions);

    return res.json({
      monthYear: currentMonthYear,
      employee: {
        id: employee?.id,
        employeeId: employee?.employeeId,
        fullName: employee?.fullName || user?.name,
        department: employee?.department,
        designation: employee?.designation,
        baseWageRate,
      },
      shift,
      attendanceSummary: {
        totalWorkingDaysInMonth,
        presentDays,
        onTimeArrivals,
        lateArrivals,
        halfDays,
        totalLateMinutes,
        totalLateHours,
      },
      deductionSummary: {
        baseWageRate,
        totalPenaltyAccrued,
        approvedDeductions,
        pendingDeductions,
        waivedDeductions,
        estimatedNetSalary,
      },
      records,
      deductions,
    });
  } catch (error: any) {
    console.error('getEmployeeAttendanceSummary error:', error);
    return res.status(500).json({ message: 'Failed to load employee attendance summary', error: error.message });
  }
}

/**
 * POST /api/attendance/correction-request
 * Submit an attendance dispute/correction request for an attendance record
 */
export async function submitCorrectionRequest(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { attendanceRecordId, requestedTime, reason } = req.body;

    if (!attendanceRecordId || !reason || !reason.trim()) {
      return res.status(400).json({ message: 'Attendance record ID and valid reason are required.' });
    }

    // Verify record ownership
    const record = await prisma.attendanceRecord.findUnique({
      where: { id: attendanceRecordId },
      include: { employee: true },
    });

    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }

    if (record.userId !== userId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Permission denied: Cannot dispute another employee’s attendance record.' });
    }

    // Check if employee is linked
    let employeeId = record.employeeId;
    if (!employeeId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { employee: true },
      });
      employeeId = user?.employee?.id || null;
    }

    if (!employeeId) {
      return res.status(400).json({ message: 'No linked employee profile found to file dispute.' });
    }

    const correction = await prisma.attendanceCorrectionRequest.create({
      data: {
        attendanceRecordId,
        employeeId,
        requestedTime: requestedTime ? new Date(requestedTime) : undefined,
        reason: reason.trim(),
        status: 'PENDING',
      },
      include: {
        attendanceRecord: true,
        employee: { select: { employeeId: true, fullName: true } },
      },
    });

    await createAuditLog({
      userId,
      userName: req.user?.name || 'Employee',
      userRole: req.user?.role || 'EMPLOYEE',
      action: 'ATTENDANCE_CORRECTION_REQUESTED',
      entityType: 'ATTENDANCE',
      entityId: record.id,
      details: `Correction requested for record ${record.id}: "${reason.trim()}"`,
    });

    return res.status(201).json({
      message: 'Attendance correction request submitted successfully. Awaiting Admin/HR review.',
      correction,
    });
  } catch (error: any) {
    console.error('submitCorrectionRequest error:', error);
    return res.status(500).json({ message: 'Failed to submit correction request', error: error.message });
  }
}

/**
 * POST /api/attendance/admin/correction/:id/review
 * Admin reviews and approves or rejects an employee's attendance correction request
 */
export async function reviewCorrectionRequest(req: AuthRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    const { id } = req.params;
    const { status, adminComments, waivePenalty } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either APPROVED or REJECTED' });
    }

    const correction = await prisma.attendanceCorrectionRequest.findUnique({
      where: { id },
      include: {
        attendanceRecord: {
          include: {
            payrollDeduction: true,
          },
        },
        employee: true,
      },
    });

    if (!correction) {
      return res.status(404).json({ message: 'Correction request not found' });
    }

    const updated = await prisma.attendanceCorrectionRequest.update({
      where: { id },
      data: {
        status,
        adminComments: adminComments || undefined,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    // If approved and waiver requested or penalty should be cleared
    if (status === 'APPROVED') {
      const recordId = correction.attendanceRecordId;
      await prisma.attendanceRecord.update({
        where: { id: recordId },
        data: {
          penaltyWaived: true,
          waiverReason: adminComments || 'Approved by Admin upon dispute review',
        },
      });

      // Update linked salary deduction if exists
      if (correction.attendanceRecord?.payrollDeduction) {
        await prisma.attendanceSalaryDeduction.update({
          where: { attendanceRecordId: recordId },
          data: {
            status: 'WAIVED',
            notes: `${correction.attendanceRecord.payrollDeduction.notes || ''} [WAIVED by Admin: ${adminComments || 'Dispute Approved'}]`,
          },
        });
      }
    }

    await createAuditLog({
      userId: adminId,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'ATTENDANCE_CORRECTION_REVIEWED',
      entityType: 'ATTENDANCE',
      entityId: correction.attendanceRecordId,
      details: `Dispute request ${id} ${status} by Admin. Comments: ${adminComments || 'None'}`,
    });

    return res.json({
      message: `Correction request has been ${status}.`,
      correction: updated,
    });
  } catch (error: any) {
    console.error('reviewCorrectionRequest error:', error);
    return res.status(500).json({ message: 'Failed to review correction request', error: error.message });
  }
}

/**
 * POST /api/attendance/admin/deduction/:id/review
 * Admin reviews and approves, waives, or adjusts an attendance salary deduction
 */
export async function reviewSalaryDeduction(req: AuthRequest, res: Response) {
  try {
    const adminId = req.user?.id;
    const { id } = req.params;
    const { status, waiverReason, adjustedAmount } = req.body;

    if (!['APPROVED', 'WAIVED', 'PENDING_APPROVAL'].includes(status)) {
      return res.status(400).json({ message: 'Invalid deduction status' });
    }

    const deduction = await prisma.attendanceSalaryDeduction.findUnique({
      where: { id },
      include: { attendanceRecord: true, employee: true },
    });

    if (!deduction) {
      return res.status(404).json({ message: 'Salary deduction record not found' });
    }

    const updated = await prisma.attendanceSalaryDeduction.update({
      where: { id },
      data: {
        status,
        ...(adjustedAmount !== undefined && !isNaN(Number(adjustedAmount))
          ? { penaltyAmount: Number(adjustedAmount) }
          : {}),
        notes: waiverReason
          ? `${deduction.notes || ''} [HR Status: ${status} - Reason: ${waiverReason}]`
          : deduction.notes,
      },
    });

    // Synchronize attendance record waiver status
    if (status === 'WAIVED') {
      await prisma.attendanceRecord.update({
        where: { id: deduction.attendanceRecordId },
        data: {
          penaltyWaived: true,
          waiverReason: waiverReason || 'Waived by Admin',
        },
      });
    } else if (status === 'APPROVED') {
      await prisma.attendanceRecord.update({
        where: { id: deduction.attendanceRecordId },
        data: {
          penaltyWaived: false,
          waiverReason: null,
          ...(adjustedAmount !== undefined && !isNaN(Number(adjustedAmount))
            ? { penaltyAmount: Number(adjustedAmount) }
            : {}),
        },
      });
    }

    await createAuditLog({
      userId: adminId,
      userName: req.user?.name || 'Admin',
      userRole: req.user?.role || 'ADMIN',
      action: 'SALARY_DEDUCTION_REVIEWED',
      entityType: 'ATTENDANCE',
      entityId: deduction.id,
      details: `Deduction ${id} for ${deduction.employee.fullName} marked as ${status}. Amount: ₹${updated.penaltyAmount}`,
    });

    return res.json({
      message: `Salary deduction marked as ${status}.`,
      deduction: updated,
    });
  } catch (error: any) {
    console.error('reviewSalaryDeduction error:', error);
    return res.status(500).json({ message: 'Failed to review salary deduction', error: error.message });
  }
}

/**
 * GET /api/attendance/admin/management
 * Admin master console to view all attendance logs with GPS verification, late minutes,
 * penalty deductions, and correction requests.
 */
export async function getAdminAttendanceManagement(req: AuthRequest, res: Response) {
  try {
    const { date, department, employeeId, locationStatus, status, month } = req.query;

    const where: any = {};

    if (date) {
      where.date = getTodayDate(date as string);
    } else if (month && typeof month === 'string' && month.match(/^\d{4}-\d{2}$/)) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;
      where.date = {
        gte: new Date(Date.UTC(year, monthIndex, 1)),
        lte: new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999)),
      };
    }

    if (status && status !== 'All') {
      where.status = status as any;
    }

    if (locationStatus && locationStatus !== 'All') {
      where.locationStatus = locationStatus as string;
    }

    if (employeeId && employeeId !== 'All') {
      where.employeeId = employeeId as string;
    }

    if (department && department !== 'All') {
      where.employee = {
        department: department as string,
      };
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ date: 'desc' }, { clockInTime: 'desc' }],
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        employee: { select: { id: true, employeeId: true, fullName: true, department: true, designation: true } },
        workplaceLocation: true,
        payrollDeduction: true,
        correctionRequests: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Also get all pending correction requests for admin badge
    const pendingCorrections = await prisma.attendanceCorrectionRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: true,
        attendanceRecord: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Deductions pending approval
    const pendingDeductions = await prisma.attendanceSalaryDeduction.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        employee: true,
        attendanceRecord: true,
      },
      orderBy: { date: 'desc' },
    });

    return res.json({
      records,
      pendingCorrections,
      pendingDeductions,
    });
  } catch (error: any) {
    console.error('getAdminAttendanceManagement error:', error);
    return res.status(500).json({ message: 'Failed to load attendance management data', error: error.message });
  }
}

/**
 * GET /api/attendance/admin/penalties
 * Monthly penalty and salary deduction analytics across all employees
 */
export async function getAdminPenaltyReports(req: AuthRequest, res: Response) {
  try {
    const { month } = req.query;
    const now = new Date();
    const currentMonthYear =
      typeof month === 'string' && month.match(/^\d{4}-\d{2}$/)
        ? month
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [yearStr, monthStr] = currentMonthYear.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;

    const startDate = new Date(Date.UTC(year, monthIndex, 1));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

    const deductions = await prisma.attendanceSalaryDeduction.findMany({
      where: {
        payPeriodMonthYear: currentMonthYear,
      },
      include: {
        employee: true,
        attendanceRecord: true,
      },
      orderBy: { date: 'desc' },
    });

    const employees = await prisma.employee.findMany({
      select: { id: true, employeeId: true, fullName: true, department: true, designation: true, baseWageRate: true },
    });

    // Calculate aggregated metrics
    const totalPenaltiesCount = deductions.length;
    const totalPenaltyAmount = deductions.reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
    const approvedAmount = deductions
      .filter((d) => d.status === 'APPROVED' || d.status === 'APPLIED_TO_PAYROLL')
      .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
    const waivedAmount = deductions
      .filter((d) => d.status === 'WAIVED')
      .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
    const pendingAmount = deductions
      .filter((d) => d.status === 'PENDING_APPROVAL')
      .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);

    // Employee-wise penalty summary
    const employeeBreakdown = employees.map((emp) => {
      const empDeductions = deductions.filter((d) => d.employeeId === emp.id);
      const totalLateMinutes = empDeductions.reduce((sum, d) => sum + d.lateDurationMinutes, 0);
      const totalAmount = empDeductions.reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
      const approved = empDeductions
        .filter((d) => d.status === 'APPROVED' || d.status === 'APPLIED_TO_PAYROLL')
        .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
      const waived = empDeductions
        .filter((d) => d.status === 'WAIVED')
        .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);
      const pending = empDeductions
        .filter((d) => d.status === 'PENDING_APPROVAL')
        .reduce((sum, d) => sum + Number(d.penaltyAmount), 0);

      return {
        employeeId: emp.employeeId,
        id: emp.id,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        baseWageRate: Number(emp.baseWageRate),
        lateCount: empDeductions.length,
        totalLateMinutes,
        totalLateHours: Math.round((totalLateMinutes / 60) * 10) / 10,
        totalAmount,
        approvedAmount: approved,
        waivedAmount: waived,
        pendingAmount: pending,
        netPayableDeduction: approved,
        deductions: empDeductions,
      };
    });

    return res.json({
      monthYear: currentMonthYear,
      summary: {
        totalPenaltiesCount,
        totalPenaltyAmount,
        approvedAmount,
        waivedAmount,
        pendingAmount,
      },
      employeeBreakdown,
      deductions,
    });
  } catch (error: any) {
    console.error('getAdminPenaltyReports error:', error);
    return res.status(500).json({ message: 'Failed to load penalty reports', error: error.message });
  }
}

/**
 * GET /api/attendance/all
 * Existing admin attendance roster overview
 */
export async function getAllAttendanceRecords(req: AuthRequest, res: Response) {
  try {
    const { date, department } = req.query;
    const targetDate = getTodayDate(date as string);

    let employees: any[] = [];
    try {
      employees = await prisma.employee.findMany({
        where: {
          ...(department && department !== 'All' ? { department: department as string } : {}),
        },
        include: {
          user: true,
        },
      });
    } catch (empErr) {
      console.warn('Could not load employees with user relation in getAllAttendanceRecords:', empErr);
      try {
        employees = await prisma.employee.findMany({
          where: {
            ...(department && department !== 'All' ? { department: department as string } : {}),
          },
        });
      } catch (e2) {
        employees = [];
      }
    }

    let records: any[] = [];
    try {
      records = await prisma.attendanceRecord.findMany({
        where: { date: targetDate },
        include: {
          user: true,
          employee: true,
          workplaceLocation: true,
          payrollDeduction: true,
          correctionRequests: true,
        },
      });
    } catch (recErr) {
      console.warn('Could not load detailed attendance relations, falling back to base records:', recErr);
      try {
        records = await prisma.attendanceRecord.findMany({
          where: { date: targetDate },
          include: {
            user: true,
            employee: true,
          },
        });
      } catch (e2) {
        records = [];
      }
    }

    const roster = employees.map((emp) => {
      const record = records.find(
        (r) => r.employeeId === emp.id || (r.userId && emp.userId && r.userId === emp.userId)
      );

      let displayStatus = 'NOT_YET_CLOCKED_IN';
      if (record) {
        displayStatus = record.status;
      }

      const shiftConfig = getEmployeeShiftConfig({
        email: emp.email || emp.user?.email,
        name: emp.fullName || emp.user?.name,
        fullName: emp.fullName,
        employeeId: emp.employeeId,
      });

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeId,
        fullName: emp.fullName,
        department: emp.department,
        designation: emp.designation,
        displayStatus,
        attendance: record || null,
        shiftConfig,
      };
    });

    const totalStaff = roster.length;
    const presentCount = roster.filter((r) => r.attendance !== null).length;
    const onTimeCount = roster.filter((r) => r.attendance?.status === 'PRESENT').length;
    const lateCount = roster.filter((r) => r.attendance?.status === 'LATE').length;
    const absentCount = totalStaff - presentCount;
    const totalLatePenalties = roster.reduce(
      (sum, r) => sum + Number(r.attendance?.penaltyAmount || 0),
      0
    );

    return res.json({
      date: targetDate,
      summary: {
        totalStaff,
        presentCount,
        onTimeCount,
        lateCount,
        absentCount,
        totalLatePenalties,
      },
      roster,
    });
  } catch (error: any) {
    console.error('getAllAttendanceRecords error:', error);
    return res.status(500).json({ message: 'Failed to fetch attendance roster', error: error.message });
  }
}

/**
 * Workplace Geofence CRUD Handlers
 */
export async function getWorkplaces(req: AuthRequest, res: Response) {
  try {
    const workplaces = await prisma.workplaceLocation.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ workplaces });
  } catch (error: any) {
    console.warn('Could not query workplace locations:', error?.message);
    return res.json({
      workplaces: [
        {
          id: 'default-hq',
          name: 'SAFAL Head Office & Operations Facility',
          address: '3-4-693/5/1/A/1, Raipura, Kakatiya colony, Hanamkonda, Telangana, 506011',
          latitude: 18.0065,
          longitude: 79.5584,
          allowedRadiusMeters: 100,
        },
      ],
    });
  }
}

export async function createWorkplace(req: AuthRequest, res: Response) {
  try {
    const { name, address, latitude, longitude, allowedRadiusMeters } = req.body;
    if (!name || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Name, address, latitude, and longitude are required' });
    }

    const wp = await prisma.workplaceLocation.create({
      data: {
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        allowedRadiusMeters: allowedRadiusMeters ? parseInt(allowedRadiusMeters, 10) : 100,
        isActive: true,
      },
    });

    return res.status(201).json({ message: 'Workplace geofence created successfully', workplace: wp });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to create workplace geofence', error: error.message });
  }
}

export async function updateWorkplace(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, allowedRadiusMeters, isActive } = req.body;

    const wp = await prisma.workplaceLocation.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(address ? { address } : {}),
        ...(latitude !== undefined ? { latitude: parseFloat(latitude) } : {}),
        ...(longitude !== undefined ? { longitude: parseFloat(longitude) } : {}),
        ...(allowedRadiusMeters !== undefined ? { allowedRadiusMeters: parseInt(allowedRadiusMeters, 10) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    return res.json({ message: 'Workplace geofence updated successfully', workplace: wp });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update workplace geofence', error: error.message });
  }
}

export async function deleteWorkplace(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    await prisma.workplaceLocation.delete({ where: { id } });
    return res.json({ message: 'Workplace geofence removed successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to delete workplace geofence', error: error.message });
  }
}

/**
 * Attendance Policy Config Handlers
 */
export async function getAttendancePolicy(req: AuthRequest, res: Response) {
  try {
    let policy = await prisma.attendancePolicyConfig.findFirst();
    if (!policy) {
      policy = await prisma.attendancePolicyConfig.create({
        data: {
          gracePeriodMinutes: 59,
          penaltyPerHourAmount: 100,
          requireGps: true,
          maxAllowedAccuracyMeters: 150,
        },
      });
    }
    return res.json({ policy });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to load attendance policy', error: error.message });
  }
}

export async function updateAttendancePolicy(req: AuthRequest, res: Response) {
  try {
    const { gracePeriodMinutes, penaltyPerHourAmount, maxDailyPenalty, requireGps, maxAllowedAccuracyMeters } = req.body;
    let policy = await prisma.attendancePolicyConfig.findFirst();

    const data: any = {
      ...(gracePeriodMinutes !== undefined ? { gracePeriodMinutes: parseInt(gracePeriodMinutes, 10) } : {}),
      ...(penaltyPerHourAmount !== undefined ? { penaltyPerHourAmount: parseFloat(penaltyPerHourAmount) } : {}),
      ...(maxDailyPenalty !== undefined ? { maxDailyPenalty: maxDailyPenalty ? parseFloat(maxDailyPenalty) : null } : {}),
      ...(requireGps !== undefined ? { requireGps: Boolean(requireGps) } : {}),
      ...(maxAllowedAccuracyMeters !== undefined ? { maxAllowedAccuracyMeters: parseInt(maxAllowedAccuracyMeters, 10) } : {}),
      updatedById: req.user?.id,
    };

    if (policy) {
      policy = await prisma.attendancePolicyConfig.update({
        where: { id: policy.id },
        data,
      });
    } else {
      policy = await prisma.attendancePolicyConfig.create({
        data,
      });
    }

    return res.json({ message: 'Attendance policy updated successfully', policy });
  } catch (error: any) {
    return res.status(500).json({ message: 'Failed to update attendance policy', error: error.message });
  }
}
