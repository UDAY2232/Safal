export interface EmployeeShiftConfig {
  employeeKey: string;
  employeeName: string;
  shiftName: string;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  startTimeFormatted: string;
  endTimeFormatted: string;
  displayTiming: string;
  totalMinutes: number;
  totalHoursText: string;
  arrivalWindow: string;
}

export function getEmployeeShiftConfig(empOrUser?: {
  email?: string | null;
  name?: string | null;
  fullName?: string | null;
  employeeId?: string | null;
}): EmployeeShiftConfig {
  const email = (empOrUser?.email || '').toLowerCase().trim();
  const name = (empOrUser?.fullName || empOrUser?.name || '').toLowerCase().trim();

  // 1. Naveen: Morning 6 AM to 9 PM
  if (email.includes('naveen') || name.includes('naveen')) {
    return {
      employeeKey: 'naveen',
      employeeName: 'Munavath Naveen',
      shiftName: 'Logistics & Dispatch Shift',
      startHour: 6,
      startMinute: 0,
      endHour: 21,
      endMinute: 0,
      startTimeFormatted: '06:00 AM',
      endTimeFormatted: '09:00 PM',
      displayTiming: '06:00 AM – 09:00 PM',
      totalMinutes: 900,
      totalHoursText: '15h 00m',
      arrivalWindow: '05:30 AM – 06:00 AM',
    };
  }

  // 2. Harini: Morning 8:30 AM to Evening 7 PM
  if (email.includes('harini') || name.includes('harini')) {
    return {
      employeeKey: 'harini',
      employeeName: 'Mudidhe Harini',
      shiftName: 'Sales & Marketing Shift',
      startHour: 8,
      startMinute: 30,
      endHour: 19,
      endMinute: 0,
      startTimeFormatted: '08:30 AM',
      endTimeFormatted: '07:00 PM',
      displayTiming: '08:30 AM – 07:00 PM',
      totalMinutes: 630,
      totalHoursText: '10h 30m',
      arrivalWindow: '08:00 AM – 08:30 AM',
    };
  }

  // 3. Sangual / Sangulal: Morning 7 AM to 5 PM
  if (email.includes('sangul') || name.includes('sangul') || name.includes('sangual')) {
    return {
      employeeKey: 'sangulal',
      employeeName: 'Guguloth sangulal',
      shiftName: 'Field Operations & Dispatch Shift',
      startHour: 7,
      startMinute: 0,
      endHour: 17,
      endMinute: 0,
      startTimeFormatted: '07:00 AM',
      endTimeFormatted: '05:00 PM',
      displayTiming: '07:00 AM – 05:00 PM',
      totalMinutes: 600,
      totalHoursText: '10h 00m',
      arrivalWindow: '06:30 AM – 07:00 AM',
    };
  }

  // 4. Pavan: Morning 6 AM to 3 PM
  if (email.includes('pavan') || name.includes('pavan')) {
    return {
      employeeKey: 'pavan',
      employeeName: 'Pavan',
      shiftName: 'Procurement & Field Officer Shift',
      startHour: 6,
      startMinute: 0,
      endHour: 15,
      endMinute: 0,
      startTimeFormatted: '06:00 AM',
      endTimeFormatted: '03:00 PM',
      displayTiming: '06:00 AM – 03:00 PM',
      totalMinutes: 540,
      totalHoursText: '9h 00m',
      arrivalWindow: '05:30 AM – 06:00 AM',
    };
  }

  // Default Standard Office Shift
  return {
    employeeKey: 'standard',
    employeeName: empOrUser?.fullName || empOrUser?.name || 'Staff Member',
    shiftName: 'Standard Office Shift',
    startHour: 6,
    startMinute: 0,
    endHour: 14,
    endMinute: 0,
    startTimeFormatted: '06:00 AM',
    endTimeFormatted: '02:00 PM',
    displayTiming: '06:00 AM – 02:00 PM (+2h Sales)',
    totalMinutes: 480,
    totalHoursText: '8h 00m',
    arrivalWindow: '05:30 AM – 06:00 AM',
  };
}
