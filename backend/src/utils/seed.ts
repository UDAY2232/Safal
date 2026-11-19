import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';

async function seed() {
  console.log('🌱 Starting SAFAL APP Database Seed...');

  // Clean existing data in reverse order of foreign keys
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.wagePayment.deleteMany();
  await prisma.employeeWageRecord.deleteMany();
  await prisma.expensePayment.deleteMany();
  await prisma.expenseClaim.deleteMany();
  await prisma.purchaseOrderFinancialRecord.deleteMany();
  await prisma.purchaseOrderStatusHistory.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.accountantProfile.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();
  await prisma.applicationSetting.deleteMany();

  const hashedAdminPassword = await bcrypt.hash('shenkar@palthya', 10);
  const hashedAccountantPassword = await bcrypt.hash('accountant123', 10);
  const hashedUdayAccountantPassword = await bcrypt.hash('uday@0211', 10);
  const hashedEmployeePassword = await bcrypt.hash('employee123', 10);

  // 1. Create Admin User (Shanker)
  const admin = await prisma.user.create({
    data: {
      name: 'Shanker',
      email: 'safelexportandimportpvtltd@gmail.com',
      passwordHash: hashedAdminPassword,
      role: 'ADMIN',
      department: 'Executive Management',
      designation: 'Managing Director & Founder',
      phone: '+91 98765 43210',
      isActive: true,
    },
  });

  // 2. Create Accountant Users
  const accountantMeena = await prisma.user.create({
    data: {
      name: 'Meena Joshi',
      email: 'meena.joshi@safal.com',
      passwordHash: hashedAccountantPassword,
      role: 'ACCOUNTANT',
      department: 'Finance & Accounts',
      designation: 'Senior Accountant',
      phone: '+91 98220 11223',
      isActive: true,
      accountantProfile: {
        create: {
          accountantId: 'ACC-001',
          canCreatePO: true,
          canSubmitPO: true,
          canReviewExpenses: true,
          canViewWages: true,
          canRecordPayments: true,
          status: 'ACTIVE',
        },
      },
    },
  });

  const accountantSanjay = await prisma.user.create({
    data: {
      name: 'Sanjay Rao',
      email: 'sanjay.rao@safal.com',
      passwordHash: hashedAccountantPassword,
      role: 'ACCOUNTANT',
      department: 'Procurement Audit',
      designation: 'Procurement Accountant',
      phone: '+91 98450 33445',
      isActive: true,
      accountantProfile: {
        create: {
          accountantId: 'ACC-002',
          canCreatePO: true,
          canSubmitPO: true,
          canReviewExpenses: true,
          canViewWages: false,
          canRecordPayments: false,
          status: 'ACTIVE',
        },
      },
    },
  });

  const accountantUday = await prisma.user.create({
    data: {
      name: 'Uday Chirra',
      email: 'chirrauday44@gmail.com',
      passwordHash: hashedUdayAccountantPassword,
      role: 'ACCOUNTANT',
      department: 'Accounts & Finance',
      designation: 'Senior Accountant',
      phone: '+91 98765 43210',
      isActive: true,
      accountantProfile: {
        create: {
          accountantId: 'ACC-044',
          canCreatePO: true,
          canSubmitPO: true,
          canReviewExpenses: true,
          canViewWages: true,
          canRecordPayments: true,
          status: 'ACTIVE',
        },
      },
      employee: {
        create: {
          employeeId: 'EMP-044',
          fullName: 'Uday Chirra',
          email: 'chirrauday44@gmail.com',
          phone: '+91 98765 43210',
          department: 'Accounts & Finance',
          designation: 'Senior Accountant',
          wageType: 'MONTHLY',
          baseWageRate: 65000,
          joiningDate: new Date('2026-11-19'),
          status: 'ACTIVE',
        },
      },
    },
  });

  // 3. Create Employees with login accounts
  const employeeRakeshUser = await prisma.user.create({
    data: {
      name: 'Rakesh Sharma',
      email: 'rakesh.sharma@safal.com',
      passwordHash: hashedEmployeePassword,
      role: 'EMPLOYEE',
      department: 'Procurement',
      designation: 'Senior Buyer',
      phone: '+91 98110 55667',
      isActive: true,
    },
  });

  const employeeVikramUser = await prisma.user.create({
    data: {
      name: 'Vikram Patel',
      email: 'vikram.patel@safal.com',
      passwordHash: hashedEmployeePassword,
      role: 'EMPLOYEE',
      department: 'Logistics',
      designation: 'Field Executive',
      phone: '+91 98330 77889',
      isActive: true,
    },
  });

  const employeeAnitaUser = await prisma.user.create({
    data: {
      name: 'Anita Verma',
      email: 'anita.verma@safal.com',
      passwordHash: hashedEmployeePassword,
      role: 'EMPLOYEE',
      department: 'Operations',
      designation: 'Operations Lead',
      phone: '+91 98990 22334',
      isActive: true,
    },
  });

  const empRakesh = await prisma.employee.create({
    data: {
      employeeId: 'EMP-001',
      userId: employeeRakeshUser.id,
      fullName: 'Rakesh Sharma',
      email: 'rakesh.sharma@safal.com',
      phone: '+91 98110 55667',
      department: 'Procurement',
      designation: 'Senior Buyer',
      wageType: 'MONTHLY',
      baseWageRate: 52000,
      status: 'ACTIVE',
    },
  });

  const empVikram = await prisma.employee.create({
    data: {
      employeeId: 'EMP-002',
      userId: employeeVikramUser.id,
      fullName: 'Vikram Patel',
      email: 'vikram.patel@safal.com',
      phone: '+91 98330 77889',
      department: 'Logistics',
      designation: 'Field Executive',
      wageType: 'DAILY',
      baseWageRate: 32800,
      status: 'ACTIVE',
    },
  });

  const empAnita = await prisma.employee.create({
    data: {
      employeeId: 'EMP-003',
      userId: employeeAnitaUser.id,
      fullName: 'Anita Verma',
      email: 'anita.verma@safal.com',
      phone: '+91 98990 22334',
      department: 'Operations',
      designation: 'Operations Lead',
      wageType: 'MONTHLY',
      baseWageRate: 44000,
      status: 'ACTIVE',
    },
  });

  const empDinesh = await prisma.employee.create({
    data: {
      employeeId: 'EMP-004',
      fullName: 'Dinesh Kumar',
      email: 'dinesh.kumar@safal.com',
      phone: '+91 98770 44556',
      department: 'Quality Control',
      designation: 'QC Inspector',
      wageType: 'MONTHLY',
      baseWageRate: 38000,
      status: 'ACTIVE',
    },
  });

  const empSunita = await prisma.employee.create({
    data: {
      employeeId: 'EMP-005',
      fullName: 'Sunita Reddy',
      email: 'sunita.reddy@safal.com',
      phone: '+91 98660 66778',
      department: 'Operations',
      designation: 'Cold Storage Supervisor',
      wageType: 'MONTHLY',
      baseWageRate: 36000,
      status: 'ACTIVE',
    },
  });

  // 4. Create Suppliers
  const supFreshValley = await prisma.supplier.create({
    data: {
      supplierCode: 'SUP-001',
      name: 'Fresh Valley Exports',
      contactPerson: 'Rajesh Thakur',
      email: 'rajesh@freshvalleyexports.in',
      phone: '+91 98160 12345',
      address: 'Industrial Orchard Zone, Theog, Shimla, Himachal Pradesh',
      country: 'India',
      category: 'Apples & Pears',
      paymentTerms: 'Net 30',
      status: 'ACTIVE',
      notes: 'Premium grade apple distributor with temperature-controlled trucks.',
    },
  });

  const supGreenOrchard = await prisma.supplier.create({
    data: {
      supplierCode: 'SUP-002',
      name: 'Green Orchard Co.',
      contactPerson: 'Sunil Deshmukh',
      email: 'sunil@greenorchard.co.in',
      phone: '+91 98230 67890',
      address: 'Fruit Market Yard, Cotton Green, Nagpur, Maharashtra',
      country: 'India',
      category: 'Citrus & Oranges',
      paymentTerms: 'Advance 20%, Balance Net 15',
      status: 'ACTIVE',
      notes: 'Certified export quality Nagpur Mandarins supplier.',
    },
  });

  const supHimalayan = await prisma.supplier.create({
    data: {
      supplierCode: 'SUP-003',
      name: 'Himalayan Harvest',
      contactPerson: 'Farooq Ahmad',
      email: 'farooq@himalayanharvest.com',
      phone: '+91 94190 54321',
      address: 'Fruit Complex, Sopore, Baramulla, Jammu & Kashmir',
      country: 'India',
      category: 'Walnuts & Kashmiri Apples',
      paymentTerms: 'Net 45',
      status: 'ACTIVE',
      notes: 'Direct orchard procurement with organic certification.',
    },
  });

  const supSunrise = await prisma.supplier.create({
    data: {
      supplierCode: 'SUP-004',
      name: 'Sunrise Produce',
      contactPerson: 'Anant Joshi',
      email: 'anant@sunriseproduce.in',
      phone: '+91 98200 98765',
      address: 'APMC Yard, Pawas Road, Ratnagiri, Maharashtra',
      country: 'India',
      category: 'Mangoes & Cashews',
      paymentTerms: 'Net 15',
      status: 'ACTIVE',
      notes: 'GI tagged Ratnagiri Alphonso mango growers collective.',
    },
  });

  const supRoyal = await prisma.supplier.create({
    data: {
      supplierCode: 'SUP-005',
      name: 'Royal Fruit Traders',
      contactPerson: 'K. Venkatesh',
      email: 'venkatesh@royalfruits.co.in',
      phone: '+91 98480 11223',
      address: 'Kothapet Fruit Market, Dilsukhnagar, Hyderabad, Telangana',
      country: 'India',
      category: 'Table Grapes & Pomegranates',
      paymentTerms: 'Net 30',
      status: 'ACTIVE',
      notes: 'Reliable supplier for southern retail delivery networks.',
    },
  });

  // 5. Create Purchase Orders (12 Purchase Orders matching reference)
  // PO 001 - Closed, Realized Profit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/001',
      poDate: new Date('2026-11-02'),
      expectedDeliveryDate: new Date('2026-11-06'),
      supplierId: supFreshValley.id,
      createdById: accountantMeena.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Main Cold Storage, Hub 1, Navi Mumbai',
      paymentTerms: 'Net 30',
      notes: 'First harvest batch of Shimla Royal Delicious Apples',
      subtotal: 960000,
      discountTotal: 845,
      taxTotal: 48000,
      grandTotal: 1007155,
      status: 'CLOSED',
      items: {
        create: [
          {
            fruitName: 'Shimla Royal Apple',
            category: 'Apples',
            varietyGrade: 'Export Grade AAA',
            quantity: 12000,
            unit: 'KG',
            ratePerUnit: 80,
            discountPercent: 0,
            taxPercent: 5,
            lineTotal: 1007155,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: 'DRAFT', changedById: accountantMeena.id, comment: 'Draft created' },
          { status: 'PENDING_APPROVAL', changedById: accountantMeena.id, comment: 'Submitted for Admin approval' },
          { status: 'APPROVED', changedById: admin.id, comment: 'Approved by Admin' },
          { status: 'OPEN', changedById: admin.id, comment: 'Consignment in transit' },
          { status: 'CLOSED', changedById: admin.id, comment: 'Goods received, inspected, and cleared' },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 1007155,
          costNotes: 'Verified against weighbridge & receiving invoice',
          allocatedTransportCost: 45000,
          allocatedLaborCost: 15000,
          linkedRevenue: 1209395,
          revenueNotes: 'Recognized from retail chain distribution contract DC-2026-88',
          realizedProfitLoss: 142240,
          financialStatus: 'PROFIT',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 002 - Closed, Realized Profit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/002',
      poDate: new Date('2026-11-04'),
      expectedDeliveryDate: new Date('2026-11-08'),
      supplierId: supGreenOrchard.id,
      createdById: accountantSanjay.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Processing Center, Nagpur',
      paymentTerms: 'Advance 20%, Balance Net 15',
      notes: 'Fresh Nagpur Mandarins for packaging and wholesale',
      subtotal: 880000,
      discountTotal: 22099,
      taxTotal: 44000,
      grandTotal: 901901,
      status: 'CLOSED',
      items: {
        create: [
          {
            fruitName: 'Nagpur Mandarin Orange',
            category: 'Citrus',
            varietyGrade: 'Grade A Sweet',
            quantity: 16000,
            unit: 'KG',
            ratePerUnit: 55,
            discountPercent: 2,
            taxPercent: 5,
            lineTotal: 901901,
          },
        ],
      },
      statusHistory: {
        create: [
          { status: 'PENDING_APPROVAL', changedById: accountantSanjay.id, comment: 'Submitted for approval' },
          { status: 'APPROVED', changedById: admin.id, comment: 'Approved' },
          { status: 'CLOSED', changedById: admin.id, comment: 'Goods received in warehouse' },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 901901,
          costNotes: 'Actual purchase cost confirmed',
          allocatedTransportCost: 28000,
          allocatedLaborCost: 12000,
          linkedRevenue: 1060401,
          revenueNotes: 'Sold to wholesale fruit terminal',
          realizedProfitLoss: 118500,
          financialStatus: 'PROFIT',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 003 - Closed, Realized Profit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/003',
      poDate: new Date('2026-11-07'),
      expectedDeliveryDate: new Date('2026-11-15'),
      supplierId: supHimalayan.id,
      createdById: accountantMeena.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Main Cold Storage, Hub 1, Navi Mumbai',
      paymentTerms: 'Net 45',
      notes: 'Kashmir Kagzi Walnuts In-shell Export Quality',
      subtotal: 1066000,
      discountTotal: 5300,
      taxTotal: 53300,
      grandTotal: 1114000,
      status: 'CLOSED',
      items: {
        create: [
          {
            fruitName: 'Kashmiri Walnut In-Shell',
            category: 'Dry Fruits & Nuts',
            varietyGrade: 'Kagzi Extra Large',
            quantity: 2600,
            unit: 'KG',
            ratePerUnit: 410,
            discountPercent: 0,
            taxPercent: 5,
            lineTotal: 1114000,
          },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 1114000,
          allocatedTransportCost: 35000,
          allocatedLaborCost: 14000,
          linkedRevenue: 1259000,
          realizedProfitLoss: 96000,
          financialStatus: 'PROFIT',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 004 - Open, Active in transit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/004',
      poDate: new Date('2026-11-08'),
      expectedDeliveryDate: new Date('2026-11-12'),
      supplierId: supRoyal.id,
      createdById: accountantSanjay.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Retail Distribution Hub, Hyderabad',
      paymentTerms: 'Net 30',
      notes: 'Anab-e-Shahi White Table Grapes',
      subtotal: 1110000,
      discountTotal: 16000,
      taxTotal: 55500,
      grandTotal: 1149500,
      status: 'OPEN',
      items: {
        create: [
          {
            fruitName: 'Anab-e-Shahi Grapes',
            category: 'Grapes',
            varietyGrade: 'Table Fresh Grade 1',
            quantity: 15000,
            unit: 'KG',
            ratePerUnit: 74,
            discountPercent: 1.5,
            taxPercent: 5,
            lineTotal: 1149500,
          },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 1149500,
          allocatedTransportCost: 40000,
          allocatedLaborCost: 18000,
          financialStatus: 'PENDING_SALES_DATA',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 005 - Open, Active in transit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/005',
      poDate: new Date('2026-11-09'),
      expectedDeliveryDate: new Date('2026-11-18'),
      supplierId: supSunrise.id,
      createdById: accountantMeena.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Cold Storage, Hub 2, Pune',
      paymentTerms: 'Net 15',
      notes: 'Alphonso Pre-season Booking Batch A',
      subtotal: 1227600,
      discountTotal: 5720,
      taxTotal: 61380,
      grandTotal: 1283260,
      status: 'OPEN',
      items: {
        create: [
          {
            fruitName: 'Ratnagiri Alphonso Mango',
            category: 'Mangoes',
            varietyGrade: 'Grade A Export',
            quantity: 1980,
            unit: 'BOX',
            ratePerUnit: 620,
            discountPercent: 1,
            taxPercent: 5,
            lineTotal: 1283260,
          },
        ],
      },
      financialRecord: {
        create: {
          financialStatus: 'PENDING_COST_DATA',
          updatedById: accountantMeena.id,
        },
      },
    },
  });

  // PO 006 - Closed, Realized Profit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/006',
      poDate: new Date('2026-11-11'),
      expectedDeliveryDate: new Date('2026-11-16'),
      supplierId: supFreshValley.id,
      createdById: accountantMeena.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Cold Storage Hub 1, Navi Mumbai',
      paymentTerms: 'Net 30',
      notes: 'Golden Delicious Apples batch 2',
      subtotal: 847000,
      discountTotal: 5295,
      taxTotal: 42350,
      grandTotal: 884055,
      status: 'CLOSED',
      items: {
        create: [
          {
            fruitName: 'Golden Delicious Apple',
            category: 'Apples',
            varietyGrade: 'Grade A Sweet Crisp',
            quantity: 11000,
            unit: 'KG',
            ratePerUnit: 77,
            discountPercent: 0.5,
            taxPercent: 5,
            lineTotal: 884055,
          },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 884055,
          allocatedTransportCost: 32000,
          allocatedLaborCost: 11000,
          linkedRevenue: 999455,
          realizedProfitLoss: 72400,
          financialStatus: 'PROFIT',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 007 - Closed, Realized Profit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/007',
      poDate: new Date('2026-11-12'),
      expectedDeliveryDate: new Date('2026-11-17'),
      supplierId: supGreenOrchard.id,
      createdById: accountantSanjay.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Processing Center, Nagpur',
      paymentTerms: 'Net 30',
      notes: 'Fresh Nagpur Mosambi (Sweet Lime)',
      subtotal: 1020000,
      discountTotal: 0,
      taxTotal: 51450,
      grandTotal: 1071450,
      status: 'CLOSED',
      items: {
        create: [
          {
            fruitName: 'Nagpur Mosambi Sweet Lime',
            category: 'Citrus',
            varietyGrade: 'Juice Grade Supreme',
            quantity: 20000,
            unit: 'KG',
            ratePerUnit: 51,
            discountPercent: 0,
            taxPercent: 5,
            lineTotal: 1071450,
          },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 1071450,
          allocatedTransportCost: 42000,
          allocatedLaborCost: 16000,
          linkedRevenue: 1253450,
          realizedProfitLoss: 124000,
          financialStatus: 'PROFIT',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 008 - Open, In Transit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/008',
      poDate: new Date('2026-11-13'),
      expectedDeliveryDate: new Date('2026-11-19'),
      supplierId: supRoyal.id,
      createdById: accountantSanjay.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Retail Distribution Hub, Hyderabad',
      paymentTerms: 'Net 30',
      notes: 'Shahi Red Pomegranates Export Grade',
      subtotal: 1275000,
      discountTotal: 2750,
      taxTotal: 63750,
      grandTotal: 1336000,
      status: 'OPEN',
      items: {
        create: [
          {
            fruitName: 'Shahi Red Pomegranate',
            category: 'Pomegranates',
            varietyGrade: 'Bhagwa Premium Deep Red',
            quantity: 8500,
            unit: 'KG',
            ratePerUnit: 150,
            discountPercent: 0.5,
            taxPercent: 5,
            lineTotal: 1336000,
          },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 1336000,
          financialStatus: 'PENDING_SALES_DATA',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 009 - Open, Active
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/009',
      poDate: new Date('2026-11-13'),
      expectedDeliveryDate: new Date('2026-11-20'),
      supplierId: supHimalayan.id,
      createdById: accountantMeena.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Main Cold Storage, Hub 1, Navi Mumbai',
      paymentTerms: 'Net 45',
      notes: 'Kinnaur Deep Red Delicious Apples',
      subtotal: 819000,
      discountTotal: 15895,
      taxTotal: 40950,
      grandTotal: 844055,
      status: 'OPEN',
      items: {
        create: [
          {
            fruitName: 'Kinnaur Red Apple',
            category: 'Apples',
            varietyGrade: 'Export Grade AAA',
            quantity: 10500,
            unit: 'KG',
            ratePerUnit: 78,
            discountPercent: 1.5,
            taxPercent: 5,
            lineTotal: 844055,
          },
        ],
      },
      financialRecord: {
        create: {
          financialStatus: 'PENDING_COST_DATA',
          updatedById: accountantMeena.id,
        },
      },
    },
  });

  // PO 010 - Closed, Realized Profit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/010',
      poDate: new Date('2026-11-13'),
      expectedDeliveryDate: new Date('2026-11-17'),
      supplierId: supSunrise.id,
      createdById: accountantSanjay.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Cold Storage, Hub 2, Pune',
      paymentTerms: 'Net 15',
      notes: 'Gujarat Kesar Mangoes Premium Lot',
      subtotal: 644000,
      discountTotal: 5436,
      taxTotal: 32200,
      grandTotal: 670764,
      status: 'CLOSED',
      items: {
        create: [
          {
            fruitName: 'Gujarat Kesar Mango',
            category: 'Mangoes',
            varietyGrade: 'Grade A Sweet Gold',
            quantity: 1150,
            unit: 'BOX',
            ratePerUnit: 560,
            discountPercent: 0.8,
            taxPercent: 5,
            lineTotal: 670764,
          },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 670764,
          allocatedTransportCost: 26000,
          allocatedLaborCost: 9500,
          linkedRevenue: 774764,
          realizedProfitLoss: 68500,
          financialStatus: 'PROFIT',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 011 - Closed, Realized Loss (Market dip)
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/011',
      poDate: new Date('2026-11-13'),
      expectedDeliveryDate: new Date('2026-11-18'),
      supplierId: supFreshValley.id,
      createdById: accountantMeena.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Main Cold Storage, Hub 1, Navi Mumbai',
      paymentTerms: 'Net 30',
      notes: 'Royal Gala Green Kiwis Imported Consignment',
      subtotal: 318000,
      discountTotal: 0,
      taxTotal: 16172,
      grandTotal: 334172,
      status: 'CLOSED',
      items: {
        create: [
          {
            fruitName: 'Hayward Green Kiwi',
            category: 'Exotic & Berries',
            varietyGrade: 'Export Jumbo 30s',
            quantity: 2000,
            unit: 'KG',
            ratePerUnit: 159,
            discountPercent: 0,
            taxPercent: 5,
            lineTotal: 334172,
          },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 334172,
          allocatedTransportCost: 25000,
          allocatedLaborCost: 8000,
          linkedRevenue: 345000,
          realizedProfitLoss: -22172,
          financialStatus: 'LOSS',
          updatedById: admin.id,
        },
      },
    },
  });

  // PO 012 - Closed, Realized Profit
  await prisma.purchaseOrder.create({
    data: {
      poNumber: 'PO/SF/2026/012',
      poDate: new Date('2026-11-13'),
      expectedDeliveryDate: new Date('2026-11-18'),
      supplierId: supHimalayan.id,
      createdById: accountantSanjay.id,
      approvedById: admin.id,
      deliveryAddress: 'SAFAL Main Cold Storage, Hub 1, Navi Mumbai',
      paymentTerms: 'Net 45',
      notes: 'Kashmir Sweet Cherries & Special Export Apples batch',
      subtotal: 1680000,
      discountTotal: 3912,
      taxTotal: 84000,
      grandTotal: 1760088,
      status: 'CLOSED',
      items: {
        create: [
          {
            fruitName: 'Kashmiri Sweet Cherry & Apple Special',
            category: 'Cherries & Apples',
            varietyGrade: 'Export Super Grade AAA',
            quantity: 4200,
            unit: 'KG',
            ratePerUnit: 400,
            discountPercent: 0.2,
            taxPercent: 5,
            lineTotal: 1760088,
          },
        ],
      },
      financialRecord: {
        create: {
          verifiedCost: 1760088,
          allocatedTransportCost: 55000,
          allocatedLaborCost: 22000,
          linkedRevenue: 2047088,
          realizedProfitLoss: 210000,
          financialStatus: 'PROFIT',
          updatedById: admin.id,
        },
      },
    },
  });

  // 6. Create Wage Records for November 2026
  // Rakesh - Fully Paid
  const w1 = await prisma.employeeWageRecord.create({
    data: {
      employeeId: empRakesh.id,
      payPeriod: 'November 2026',
      wageType: 'MONTHLY',
      wageRate: 52000,
      grossAmount: 52000,
      deductions: 0,
      netPayable: 52000,
      amountPaid: 52000,
      balanceRemaining: 0,
      status: 'PAID',
      payments: {
        create: {
          amount: 52000,
          paymentDate: new Date('2026-11-10'),
          paymentMethod: 'Bank Transfer (NEFT)',
          transactionRef: 'NEFT/HDFC/20261110091244',
          notes: 'Full salary credited for Nov 2026',
          recordedById: admin.id,
          receiptNumber: 'RCP/WAG/2026/001',
        },
      },
    },
  });

  // Vikram - Fully Paid
  await prisma.employeeWageRecord.create({
    data: {
      employeeId: empVikram.id,
      payPeriod: 'November 2026',
      wageType: 'DAILY',
      wageRate: 32800,
      grossAmount: 32800,
      deductions: 0,
      netPayable: 32800,
      amountPaid: 32800,
      balanceRemaining: 0,
      status: 'PAID',
      payments: {
        create: {
          amount: 32800,
          paymentDate: new Date('2026-11-10'),
          paymentMethod: 'Bank Transfer (IMPS)',
          transactionRef: 'IMPS/ICICI/20261110114402',
          notes: 'Field logistics wages disbursed',
          recordedById: admin.id,
          receiptNumber: 'RCP/WAG/2026/002',
        },
      },
    },
  });

  // Anita - Partially Paid
  await prisma.employeeWageRecord.create({
    data: {
      employeeId: empAnita.id,
      payPeriod: 'November 2026',
      wageType: 'MONTHLY',
      wageRate: 44000,
      grossAmount: 44000,
      deductions: 0,
      netPayable: 44000,
      amountPaid: 20000,
      balanceRemaining: 24000,
      status: 'PARTIALLY_PAID',
      payments: {
        create: {
          amount: 20000,
          paymentDate: new Date('2026-11-11'),
          paymentMethod: 'Bank Transfer (NEFT)',
          transactionRef: 'NEFT/SBI/20261111162391',
          notes: 'Mid-month advance salary settlement',
          recordedById: accountantMeena.id,
          receiptNumber: 'RCP/WAG/2026/003',
        },
      },
    },
  });

  // Dinesh - Pending Payment
  await prisma.employeeWageRecord.create({
    data: {
      employeeId: empDinesh.id,
      payPeriod: 'November 2026',
      wageType: 'MONTHLY',
      wageRate: 38000,
      grossAmount: 38000,
      deductions: 0,
      netPayable: 38000,
      amountPaid: 0,
      balanceRemaining: 38000,
      status: 'PENDING',
    },
  });

  // Sunita - Pending Payment
  await prisma.employeeWageRecord.create({
    data: {
      employeeId: empSunita.id,
      payPeriod: 'November 2026',
      wageType: 'MONTHLY',
      wageRate: 36000,
      grossAmount: 36000,
      deductions: 0,
      netPayable: 36000,
      amountPaid: 0,
      balanceRemaining: 36000,
      status: 'PENDING',
    },
  });

  // 7. Create Expense Claims
  // Claim 1 - Approved, Payment Pending
  await prisma.expenseClaim.create({
    data: {
      claimNumber: 'EXP/SF/2026/001',
      employeeId: empRakesh.id,
      expenseDate: new Date('2026-11-12'),
      category: 'Official Travel',
      description: 'Shimla apple orchard inspection tour',
      businessPurpose: 'Supplier quality evaluation and pre-harvest contract signing with local growers',
      travelFrom: 'New Delhi HQ',
      travelTo: 'Theog & Rohru, Shimla',
      amountSpent: 18450,
      approvedAmount: 18450,
      amountPaid: 0,
      balanceRemaining: 18450,
      paymentMethodUsed: 'Personal Credit Card',
      receiptUrl: '/uploads/sample-receipt-travel.pdf',
      status: 'PAYMENT_PENDING',
      reviewedById: accountantMeena.id,
      reviewedAt: new Date('2026-11-13'),
      approvedById: admin.id,
      approvedAt: new Date('2026-11-13'),
    },
  });

  // Claim 2 - Paid / Cleared
  await prisma.expenseClaim.create({
    data: {
      claimNumber: 'EXP/SF/2026/002',
      employeeId: empVikram.id,
      expenseDate: new Date('2026-11-11'),
      category: 'Fuel & Transportation',
      description: 'Diesel refueling and highway tolls for cold container truck MH-12-SF-4401',
      businessPurpose: 'Immediate transport of perishable orange consignment to cold storage',
      travelFrom: 'Nagpur Orchard Yard',
      travelTo: 'Navi Mumbai Cold Hub',
      amountSpent: 8200,
      approvedAmount: 7800,
      amountPaid: 7800,
      balanceRemaining: 0,
      paymentMethodUsed: 'Fastag & Cash',
      receiptUrl: '/uploads/sample-receipt-fuel.jpg',
      status: 'PAID_CLEARED',
      reviewedById: accountantMeena.id,
      reviewedAt: new Date('2026-11-11'),
      approvedById: admin.id,
      approvedAt: new Date('2026-11-12'),
      payments: {
        create: {
          amount: 7800,
          paymentDate: new Date('2026-11-12'),
          paymentMethod: 'UPI Direct',
          transactionRef: 'UPI/AXIS/2026111288331',
          notes: 'Full reimbursement cleared to employee bank account',
          recordedById: admin.id,
          receiptNumber: 'RCP/EXP/2026/001',
        },
      },
    },
  });

  // Claim 3 - Approved, Ready for clearance
  await prisma.expenseClaim.create({
    data: {
      claimNumber: 'EXP/SF/2026/003',
      employeeId: empAnita.id,
      expenseDate: new Date('2026-11-10'),
      category: 'Client Meetings',
      description: 'Business lunch and sample presentation with Reliance Fresh retail buyers',
      businessPurpose: 'Secured annual procurement agreement for Alphonso and Kesar mango supply',
      amountSpent: 5300,
      approvedAmount: 5300,
      amountPaid: 0,
      balanceRemaining: 5300,
      paymentMethodUsed: 'UPI',
      status: 'APPROVED',
      reviewedById: accountantMeena.id,
      reviewedAt: new Date('2026-11-11'),
      approvedById: admin.id,
      approvedAt: new Date('2026-11-11'),
    },
  });

  // Claim 4 - Partially Reimbursed
  await prisma.expenseClaim.create({
    data: {
      claimNumber: 'EXP/SF/2026/004',
      employeeId: empDinesh.id,
      expenseDate: new Date('2026-11-09'),
      category: 'Loading & Unloading',
      description: 'Emergency crane and cold storage manual loading labor',
      businessPurpose: 'Offloading 15-ton refrigerated trailer during midnight arrival',
      amountSpent: 12600,
      approvedAmount: 12600,
      amountPaid: 6000,
      balanceRemaining: 6600,
      paymentMethodUsed: 'Cash',
      status: 'PARTIALLY_REIMBURSED',
      reviewedById: accountantSanjay.id,
      reviewedAt: new Date('2026-11-10'),
      approvedById: admin.id,
      approvedAt: new Date('2026-11-10'),
      payments: {
        create: {
          amount: 6000,
          paymentDate: new Date('2026-11-11'),
          paymentMethod: 'Bank Transfer (IMPS)',
          transactionRef: 'IMPS/HDFC/2026111194218',
          notes: 'Part 1 reimbursement paid against emergency voucher',
          recordedById: accountantMeena.id,
          receiptNumber: 'RCP/EXP/2026/002',
        },
      },
    },
  });

  // Claim 5 - Rejected
  await prisma.expenseClaim.create({
    data: {
      claimNumber: 'EXP/SF/2026/005',
      employeeId: empRakesh.id,
      expenseDate: new Date('2026-11-08'),
      category: 'Office Supplies',
      description: 'Purchased personal stationery and extra packing materials',
      businessPurpose: 'Field office maintenance',
      amountSpent: 2750,
      approvedAmount: 0,
      amountPaid: 0,
      balanceRemaining: 0,
      status: 'REJECTED',
      rejectionReason: 'GST invoice missing; itemized vendor bill required per company policy',
      reviewedById: accountantMeena.id,
      reviewedAt: new Date('2026-11-09'),
      approvedById: admin.id,
      approvedAt: new Date('2026-11-09'),
    },
  });

  // 8. Notifications
  await prisma.notification.createMany({
    data: [
      {
        recipientRole: 'ADMIN',
        title: 'New PO Awaiting Approval',
        message: 'PO/SF/2026/005 from Sunrise Produce (₹11,48,364) submitted by Meena Joshi',
        type: 'ACTION_REQUIRED',
        linkUrl: '/purchase-orders',
        isRead: false,
      },
      {
        recipientRole: 'ADMIN',
        title: 'Expense Claim Ready for Clearance',
        message: 'EXP/SF/2026/001 (₹18,450) approved for Rakesh Sharma, pending payment',
        type: 'INFO',
        linkUrl: '/clearance',
        isRead: false,
      },
      {
        userId: accountantMeena.id,
        title: 'Purchase Order Approved',
        message: 'Your Purchase Order PO/SF/2026/001 has been approved by Admin.',
        type: 'SUCCESS',
        linkUrl: '/purchase-orders',
        isRead: true,
      },
      {
        userId: employeeRakeshUser.id,
        title: 'Expense Claim Status Update',
        message: 'Your claim EXP/SF/2026/001 was approved by Admin. Payment will be disbursed soon.',
        type: 'SUCCESS',
        linkUrl: '/expenses',
        isRead: false,
      },
    ],
  });

  // 9. Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        userName: 'Admin Kumar',
        userRole: 'ADMIN',
        action: 'SYSTEM_INITIALIZED',
        entityType: 'SYSTEM',
        details: 'SAFAL APP system initialized with production PostgreSQL database',
      },
      {
        userId: accountantMeena.id,
        userName: 'Meena Joshi',
        userRole: 'ACCOUNTANT',
        action: 'PO_SUBMITTED',
        entityType: 'PURCHASE_ORDER',
        details: 'Submitted PO/SF/2026/001 for ₹9,77,760 to Fresh Valley Exports',
      },
      {
        userId: admin.id,
        userName: 'Admin Kumar',
        userRole: 'ADMIN',
        action: 'PO_APPROVED',
        entityType: 'PURCHASE_ORDER',
        details: 'Approved PO/SF/2026/001',
      },
      {
        userId: admin.id,
        userName: 'Admin Kumar',
        userRole: 'ADMIN',
        action: 'PO_FINANCIALS_UPDATED',
        entityType: 'PURCHASE_ORDER',
        details: 'PO/SF/2026/001 verified profit calculated: +₹1,42,240 (Profit)',
      },
      {
        userId: admin.id,
        userName: 'Admin Kumar',
        userRole: 'ADMIN',
        action: 'WAGE_PAYMENT_RECORDED',
        entityType: 'WAGES',
        details: 'Salary payment of ₹52,000 recorded for Rakesh Sharma (November 2026)',
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('--------------------------------------------------');
  console.log('🔑 Master Administrator Account:');
  console.log('Name:     Shanker');
  console.log('Email:    safelexportandimportpvtltd@gmail.com');
  console.log('Password: shenkar@palthya');
  console.log('--------------------------------------------------');
}

seed()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

