import { prisma } from '../config/db.js';

export async function ensureAttendancePolicyAndWorkplaces() {
  try {
    // 1. Ensure Attendance Policy Configuration
    const existingPolicy = await prisma.attendancePolicyConfig.findFirst();
    if (!existingPolicy) {
      await prisma.attendancePolicyConfig.create({
        data: {
          gracePeriodMinutes: 59, // Under 1 hour is ₹0
          penaltyPerHourAmount: 100, // ₹100 per hour
          requireGps: true,
          maxAllowedAccuracyMeters: 150,
        },
      });
      console.log('[Attendance Policy] Seeded default late arrival penalty policy (₹100/hr, <60m grace).');
    }

    // 2. Ensure Default Authorized Workplace Geofences
    const defaultWorkplaces = [
      {
        name: 'SAFAL Head Office & Operations Facility',
        address: '3-4-693/5/1/A/1, Raipura, Kakatiya colony, Hanamkonda, Telangana, 506011',
        latitude: 18.0065,
        longitude: 79.5584,
        allowedRadiusMeters: 100,
      },
      {
        name: 'Warangal Regional Hub & Cold Storage',
        address: 'Industrial Estate, Warangal, Telangana, 506007',
        latitude: 17.9784,
        longitude: 79.5941,
        allowedRadiusMeters: 150,
      },
      {
        name: 'Hyderabad Regional Logistics Hub',
        address: 'Kothapet Fruit Market, Dilsukhnagar, Hyderabad, 500035',
        latitude: 17.3688,
        longitude: 78.5392,
        allowedRadiusMeters: 200,
      },
    ];

    for (const wp of defaultWorkplaces) {
      const exists = await prisma.workplaceLocation.findUnique({
        where: { name: wp.name },
      });
      if (!exists) {
        await prisma.workplaceLocation.create({
          data: {
            name: wp.name,
            address: wp.address,
            latitude: wp.latitude,
            longitude: wp.longitude,
            allowedRadiusMeters: wp.allowedRadiusMeters,
            isActive: true,
          },
        });
        console.log(`[Workplace Geofence] Created workplace location: ${wp.name}`);
      }
    }
  } catch (e) {
    console.warn('[Attendance Policy] Error initializing attendance config:', e);
  }
}
