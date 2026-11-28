import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

export async function ensureFieldDataSeed(): Promise<void> {
  try {
    console.log('[Field Seed] Initializing Field Work territory and scoring configuration...');

    // 1. Ensure scoring configuration
    const existingConfig = await prisma.fieldScoringConfig.findFirst();
    if (!existingConfig) {
      await prisma.fieldScoringConfig.create({
        data: {
          uniqueVisitPoints: 5,
          newSellerRegPoints: 10,
          firstPurchasePoints: 50,
          repeatPurchasePoints: 20,
          dailyReportPoints: 5,
        },
      });
      console.log('[Field Seed] Created default FieldScoringConfig.');
    }

    // 2. Ensure Pavan user & employee record exists
    let pavanUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'pavan@safal.com' },
          { name: { contains: 'Pavan', mode: 'insensitive' } },
        ],
      },
    });

    if (!pavanUser) {
      const pavanHash = await bcrypt.hash('pavan@safal', 10);
      pavanUser = await prisma.user.create({
        data: {
          email: 'pavan@safal.com',
          name: 'Pavan',
          role: 'EMPLOYEE',
          department: 'Field Sales & Procurement',
          designation: 'Senior Field Executive',
          phone: '+91 98480 12345',
          passwordHash: pavanHash,
          isActive: true,
        },
      });
      console.log('[Field Seed] Created User for Pavan (pavan@safal.com)');
    }

    let pavanEmp = await prisma.employee.findFirst({
      where: {
        OR: [
          { userId: pavanUser.id },
          { email: 'pavan@safal.com' },
          { fullName: { contains: 'Pavan', mode: 'insensitive' } },
        ],
      },
    });

    if (!pavanEmp) {
      pavanEmp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-007',
          userId: pavanUser.id,
          fullName: 'Pavan',
          email: 'pavan@safal.com',
          phone: '+91 98480 12345',
          department: 'Field Sales & Procurement',
          designation: 'Senior Field Executive',
          baseWageRate: 28000,
          status: 'ACTIVE',
        },
      });
      console.log('[Field Seed] Created Employee EMP-007 for Pavan.');
    }

    // 3. Defined Territories & Initial Assignments
    const territoryMap: { employeeName: string; employeeEmail: string; areas: string[] }[] = [
      {
        employeeName: 'Harini',
        employeeEmail: 'harini@safal.com',
        areas: ['Warangal', 'Hanamkonda', 'Kazipet'],
      },
      {
        employeeName: 'Naveen',
        employeeEmail: 'naveen@safal.com',
        areas: ['Hasanparthy', 'Ghanpur', 'Huzurabad', 'Parakal'],
      },
      {
        employeeName: 'Sangulal',
        employeeEmail: 'sangulal@safal.com',
        areas: ['Mahabubabad', 'Thorrur', 'Suryapet', 'Bhadrachalam'],
      },
      {
        employeeName: 'Pavan',
        employeeEmail: 'pavan@safal.com',
        areas: ['Bhupalpally', 'Karimnagar', 'Khammam'],
      },
    ];

    // Find Admin for assignedById
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });

    for (const alloc of territoryMap) {
      // Find employee
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { email: alloc.employeeEmail },
            { fullName: { contains: alloc.employeeName, mode: 'insensitive' } },
          ],
        },
      });

      if (!emp) {
        console.warn(`[Field Seed] Employee ${alloc.employeeName} not found, skipping area assignment.`);
        continue;
      }

      for (const areaName of alloc.areas) {
        // Find or create area
        const area = await prisma.fieldArea.upsert({
          where: { name: areaName },
          update: { isActive: true },
          create: {
            name: areaName,
            state: 'Telangana',
            district: getDistrictForArea(areaName),
            isActive: true,
          },
        });

        // Upsert assignment
        await prisma.fieldAreaAssignment.upsert({
          where: {
            employeeId_areaId: {
              employeeId: emp.id,
              areaId: area.id,
            },
          },
          update: { isActive: true },
          create: {
            employeeId: emp.id,
            areaId: area.id,
            assignedById: adminUser?.id || null,
            isActive: true,
            notes: `Initial territory assignment: ${areaName} allocated to ${emp.fullName}`,
          },
        });
      }
    }

    console.log('[Field Seed] Field Work territory initialization completed.');
  } catch (err) {
    console.error('[Field Seed] Error initializing field territory seed:', err);
  }
}

function getDistrictForArea(area: string): string {
  const map: Record<string, string> = {
    Warangal: 'Warangal',
    Hanamkonda: 'Hanamkonda',
    Kazipet: 'Hanamkonda',
    Hasanparthy: 'Hanamkonda',
    Ghanpur: 'Jangaon',
    Huzurabad: 'Karimnagar',
    Parakal: 'Hanamkonda',
    Mahabubabad: 'Mahabubabad',
    Thorrur: 'Mahabubabad',
    Suryapet: 'Suryapet',
    Bhadrachalam: 'Bhadradri Kothagudem',
    Bhupalpally: 'Jayashankar Bhupalpally',
    Karimnagar: 'Karimnagar',
    Khammam: 'Khammam',
  };
  return map[area] || 'Telangana';
}
