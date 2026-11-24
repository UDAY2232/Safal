export type Role = 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE' | 'VENDOR';

export interface VendorProfile {
  id: string;
  vendorId: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string | null;
  primaryLocation: string;
  aadharNumberMasked?: string;
  panNumber: string;
  bankAccountNumberMasked?: string;
  bankIfscCode: string;
  bankAccountHolder: string;
  bankName?: string | null;
  bankBranch?: string | null;
  isKycLocked: boolean;
  kycLockedAt?: string | null;
  status: string;
}

export const VENDOR_WHITELISTED_LOCATIONS = [
  'Chennai',
  'Madurai',
  'Varanasi',
  'Siliguri',
  'Bengaluru',
  'Hyderabad',
  'Warangal',
  'Vijayawada',
] as const;

export const VENDOR_WHITELISTED_FRUITS = [
  'Kashmir Apples',
  'Pomegranate',
  'Watermelon',
  'Muskmelon',
  'Banana',
  'Orange',
  'Plum',
] as const;

export type PODispatchStatus =
  | 'PENDING_DISPATCH'
  | 'LOADED_AND_DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED_AT_HUB'
  | 'REJECTED_TRANSIT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department?: string | null;
  designation?: string | null;
  phone?: string | null;
  accountantProfile?: {
    id: string;
    accountantId: string;
    canCreatePO: boolean;
    canSubmitPO: boolean;
    canReviewExpenses: boolean;
    canViewWages: boolean;
    canRecordPayments: boolean;
  } | null;
  employee?: {
    id: string;
    employeeId: string;
    fullName?: string;
    department: string;
    designation: string;
    wageType?: string;
    baseWageRate?: number;
    status?: string;
  } | null;
  vendorProfile?: VendorProfile | null;
}

export type POStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'OPEN' | 'CLOSED' | 'REJECTED' | 'CANCELLED';

export type FinancialStatus =
  | 'NOT_CALCULATED'
  | 'PENDING_COST_DATA'
  | 'PENDING_SALES_DATA'
  | 'IN_PROGRESS'
  | 'PROFIT'
  | 'LOSS'
  | 'BREAK_EVEN';

export interface POItem {
  id?: string;
  fruitName: string;
  category: string;
  varietyGrade: string;
  quantity: number;
  unit: string;
  ratePerUnit: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  poDate: string;
  expectedDeliveryDate?: string | null;
  createdById: string;
  createdByName: string;
  approvedById?: string | null;
  approvedByName?: string | null;
  deliveryAddress?: string | null;
  orderPersonPlace?: string | null;
  paymentTerms?: string | null;
  notes?: string | null;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  advanceAmount?: number;
  pendingAmount?: number;
  status: POStatus;
  rejectionReason?: string | null;
  paymentProofUrl?: string | null;
  paymentProofNotes?: string | null;
  vendorProfileId?: string | null;
  vendorProfile?: VendorProfile | null;
  dispatchVehicleNumber?: string | null;
  vehiclePhotoUrl?: string | null;
  transportBillUrl?: string | null;
  transporterName?: string | null;
  driverPhone?: string | null;
  dispatchDate?: string | null;
  dispatchStatus?: PODispatchStatus;
  autoAdvanceCalculated?: number | null;
  weighbridgeGrossKg?: number | null;
  weighbridgeTareKg?: number | null;
  weighbridgeNetKg?: number | null;
  weighbridgeSlipUrl?: string | null;
  qcInspectionStatus?: string | null;
  qcGradeARatio?: number | null;
  qcGradeBRatio?: number | null;
  qcWastageKg?: number | null;
  qcInspectorName?: string | null;
  qcInspectionDate?: string | null;
  qcInspectionRemarks?: string | null;
  itemsCount: number;
  items?: POItem[];
  financial: {
    verifiedCost: number | null;
    allocatedTransportCost: number;
    allocatedLaborCost: number;
    linkedRevenue: number | null;
    realizedProfitLoss: number | null;
    financialStatus: FinancialStatus;
  };
}

export interface Supplier {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country: string;
  category: string;
  paymentTerms: string;
  status: string;
  notes?: string | null;
  poCount: number;
  totalPOValue: number;
}

export interface Employee {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  department: string;
  designation: string;
  joiningDate: string;
  wageType: 'MONTHLY' | 'DAILY' | 'HOURLY';
  baseWageRate: number;
  status: string;
  totalClaims?: number;
  latestWageRecord?: {
    payPeriod: string;
    netPayable: number;
    status: string;
  } | null;
}

export interface WagePayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionRef: string;
  notes?: string | null;
  receiptNumber: string;
}

export interface WageRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  wageType: string;
  wageRate: number;
  payPeriod: string;
  workedUnits?: number | null;
  grossAmount: number;
  deductions: number;
  deductionNotes?: string | null;
  netPayable: number;
  amountPaid: number;
  balanceRemaining: number;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
  paymentsCount: number;
  latestPaymentDate?: string | null;
  payments?: WagePayment[];
}

export interface MySalaryPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionRef: string;
  receiptNumber: string;
  notes?: string | null;
}

export interface MySalaryRecord {
  id: string;
  payPeriod: string;
  wageType: string;
  wageRate: number;
  workedUnits?: number | null;
  grossAmount: number;
  deductions: number;
  deductionNotes?: string | null;
  netPayable: number;
  amountPaid: number;
  balanceRemaining: number;
  status: string;
  payments: MySalaryPayment[];
}

export interface MySalaryData {
  id?: string;
  employeeId: string;
  fullName: string;
  designation: string;
  department: string;
  wageType: string;
  baseWageRate: number;
  status: string;
  joiningDate?: string;
  totalGross?: number;
  totalDeductions?: number;
  totalNetPayable: number;
  totalPaid: number;
  balanceRemaining: number;
  latestPeriod?: string | null;
  latestStatus?: string | null;
  records: MySalaryRecord[];
}

export interface ExpensePayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionRef: string;
  notes?: string | null;
  receiptNumber: string;
}

export interface ExpenseClaim {
  id: string;
  claimNumber: string;
  employeeId: string;
  employeeName: string;
  department: string;
  expenseDate: string;
  category: string;
  description: string;
  businessPurpose: string;
  travelFrom?: string | null;
  travelTo?: string | null;
  amountSpent: number;
  approvedAmount: number;
  amountPaid: number;
  balanceRemaining: number;
  paymentMethodUsed?: string | null;
  receiptUrl?: string | null;
  status:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'APPROVED'
    | 'REJECTED'
    | 'PAYMENT_PENDING'
    | 'PARTIALLY_REIMBURSED'
    | 'PAID_CLEARED';
  rejectionReason?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  paymentsCount: number;
  payments?: ExpensePayment[];
}

export interface ClearanceBill {
  id: string;
  billId: string;
  type: 'EXPENSE_REIMBURSEMENT' | 'WAGE_PAYMENT';
  employeeId: string;
  employeeName: string;
  department: string;
  category: string;
  billDate: string;
  approvedAmount: number;
  amountPaid: number;
  balanceRemaining: number;
  clearanceStatus: 'Payment Pending' | 'Partially Paid' | 'Paid/Cleared';
  latestPaymentDate?: string | null;
  latestPaymentMethod?: string;
  latestTransactionRef?: string;
  paymentsCount: number;
  payments?: any[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string | null;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export type InvoiceType = 'SALES' | 'PURCHASE' | 'EXPORT' | 'IMPORT';

export interface InvoiceItem {
  id?: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  partyName: string;
  partyGst?: string | null;
  partyAddress?: string | null;
  partyEmail?: string | null;
  partyPhone?: string | null;
  invoiceDate: string;
  dueDate: string;
  linkedPoNumber?: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  freightShipping: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  paymentTerms?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  items?: InvoiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  overdueCount: number;
}


