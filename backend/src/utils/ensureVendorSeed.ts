import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';

export async function ensureDefaultVendor() {
  try {
    const existingVendor = await prisma.vendorProfile.findFirst({
      where: { vendorId: 'VND-001' },
    });

    if (existingVendor) {
      console.log('✓ Default vendor VND-001 already exists.');
    } else {
      const passwordHash = await bcrypt.hash('vendor123', 10);
      const email = 'vendor001@safalexports.com';

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            passwordHash,
            name: 'Ramesh Agro Farms',
            role: 'VENDOR',
            department: 'Vendor Procurement',
            designation: 'Wholesale Apple & Fruit Supplier',
            phone: '9848012345',
            isActive: true,
          },
        });
      }

      await prisma.vendorProfile.create({
        data: {
          vendorId: 'VND-001',
          userId: user.id,
          businessName: 'Ramesh Agro Farms & Cold Storage',
          contactPerson: 'Ramesh Kumar',
          phone: '9848012345',
          email,
          primaryLocation: 'Warangal',
          aadharNumber: '987654321098',
          panNumber: 'ABCDE1234F',
          bankAccountNumber: '91802003456789',
          bankIfscCode: 'SBIN0001234',
          bankAccountHolder: 'Ramesh Agro Farms',
          bankName: 'State Bank of India',
          bankBranch: 'Enumamula Mandi Branch, Warangal',
          isKycLocked: true,
          kycLockedAt: new Date(),
          status: 'ACTIVE',
        },
      });

      // Also link Supplier
      const supplier = await prisma.supplier.findUnique({ where: { supplierCode: 'VND-001' } });
      if (!supplier) {
        await prisma.supplier.create({
          data: {
            supplierCode: 'VND-001',
            name: 'Ramesh Agro Farms & Cold Storage',
            contactPerson: 'Ramesh Kumar',
            email,
            phone: '9848012345',
            address: 'Enumamula Fruit Market, Warangal, Telangana',
            category: 'Wholesale Fruits (Vendor)',
            paymentTerms: '70% Advance / Balance on Delivery',
            status: 'ACTIVE',
            notes: 'Auto-linked Vendor VND-001 (Aadhaar: XXXX-XXXX-1098, PAN: ABCDE1234F)',
          },
        });
      }

      console.log('✓ Seeded default vendor VND-001 (Ramesh Agro Farms) successfully.');
    }
  } catch (err) {
    console.error('Error seeding default vendor:', err);
  }
}
