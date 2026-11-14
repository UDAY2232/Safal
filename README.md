# SAFAL APP – Complete Purchase Order, Employee, Accounting & Financial Management System
**Company:** SAFAL EXPORT AND IMPORT PVT LTD  
**Industry:** Premium Fruits Import & Export  
**Status:** Standalone Full-Stack Enterprise Platform (Production-Ready)

---

## 1. Overview & Architecture

SAFAL APP is an independent enterprise business management platform built from scratch for **SAFAL EXPORT AND IMPORT PVT LTD**. It integrates:
- **Purchase Order (PO) Management** with multi-fruit procurement (rates, quantities, discount %, GST %, line totals, automatic numbering `PO/SF/2026/XXX`).
- **Verified Financial Tracking**: Realized Profit & Loss calculated strictly via traceable formulas:
  $$\text{Realized Profit/Loss} = \text{Verified Recognized Sales Revenue} - (\text{Verified Purchase Cost} + \text{Allocated Transport} + \text{Allocated Labor})$$
- **Employee Wages & Salary Management**: Multi-wage types (Monthly, Daily, Hourly), automatic pay period generation, gross, deductions, net payable, partial/full payments with audit receipts (`RCP/WAG/YYYY/XXX`).
- **Employee Company Spending & Expense Reimbursements**: Itemized claims, travel details, receipt attachment uploads, accountant review workflow, admin approval/rejection with mandatory reasons, and partial/full reimbursement payments.
- **Bill Clearance Workbench**: Consolidated financial settlement desk for all approved expense claims and salary dues, preventing duplicate payments and ensuring traceable transaction references (NEFT/IMPS/RTGS/UPI).
- **Accountant Performance Monitoring**: Admin-only audit console calculating real throughput (POs created, approval rate %, claims reviewed, turnaround time) from actual database activity.
- **Role-Based Access Control (RBAC)**: Enforced backend API authorization across 3 distinct personas: Admin, Accountant, and Employee.
- **Audit Logs & In-App Notifications**: Append-only tamper-proof audit trail capturing user, action, entity, before/after values, and timestamps.

```
safal-app/
├── backend/                       # Node.js + Express + TypeScript + Prisma REST API
│   ├── src/
│   │   ├── config/                # Prisma DB singleton & JWT settings
│   │   ├── controllers/           # Auth, Admin, PO, Wages, Expenses, Clearance, Suppliers, Reports, Settings
│   │   ├── middleware/            # JWT auth, RBAC role & permission guards, Multer upload
│   │   ├── routes/                # Modular REST route handlers
│   │   ├── services/              # Audit logging, PDFKit Purchase Order & receipt generator
│   │   └── utils/seed.ts          # Comprehensive production database seed
│   ├── prisma/
│   │   └── schema.prisma          # PostgreSQL 15-table normalized schema
│   ├── package.json
│   └── tsconfig.json
├── src/                           # React + TypeScript + Vite + Tailwind CSS Frontend
│   ├── components/                # Header, Sidebar, StatCard, StatusBadge, Modals (PO, Expense, Clearance, etc.)
│   ├── context/                   # AuthContext with JWT token persistence & quick persona switcher
│   ├── pages/                     # Dashboard (Admin/Accountant/Employee), POs, Expenses, Wages, Clearance, etc.
│   ├── services/                  # Clean API client
│   └── types/                     # TypeScript interfaces
├── uploads/                       # Secure directory for uploaded bills & receipts
├── README.md
└── package.json
```

---

## 2. Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React icons, Recharts (dynamic charts), Vite.
- **Backend:** Node.js, Express.js, TypeScript, REST API architecture.
- **Database:** PostgreSQL (running on dedicated port 5433 / `safal_db`), Prisma ORM with strict decimal types (`@db.Decimal(14, 2)`).
- **Authentication:** JWT, bcrypt password hashing, Role-Based Access Control (RBAC).
- **Document Management:** PDF generation (PDFKit), CSV report streaming, Multer file upload handling for receipts.

---

## 3. Demo Credentials & User Roles

| Role | Email | Password | Permissions & Scope |
|---|---|---|---|
| **Admin** | `admin@safal.com` | `admin123` | Full application control, approve/reject POs, approve expenses, wage setup, accountant performance, audit logs, settings. |
| **Accountant** | `meena.joshi@safal.com` | `accountant123` | Procurement PO drafting & submission, expense claim review, permitted wage records, record payments. |
| **Accountant (Audit)** | `sanjay.rao@safal.com` | `accountant123` | PO creation & review without confidential wage visibility. |
| **Employee** | `rakesh.sharma@safal.com` | `employee123` | Submit company travel/spending claims, upload receipts, view approval status and personal wage record. |

*(Note: The UI Header includes a convenient **One-Click Persona Switcher** allowing you to instantly switch between Admin, Accountant, and Employee views to test access control and workflows).*

---

## 4. Setup & Running Locally

### Prerequisites
- Node.js v18+ (Node v20 tested)
- PostgreSQL 14+ running locally with database `safal_db`

### Quick Start

1. **Install Dependencies:**
   ```bash
   npm install
   cd backend && npm install && cd ..
   ```

2. **Configure Database Connection (`backend/.env`):**
   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:uday0211%2540jr@localhost:5433/safal_db?schema=public"
   JWT_SECRET="safal_jwt_enterprise_key_fruits_export_import_2026_production"
   JWT_EXPIRES_IN="7d"
   ```

3. **Synchronize Schema & Seed Database:**
   ```bash
   cd backend
   npx prisma generate
   npx prisma db push
   npx tsx src/utils/seed.ts
   cd ..
   ```

4. **Start Backend & Frontend:**
   - **Backend Server:**
     ```bash
     npm run dev:backend
     # Runs on http://localhost:5000
     ```
   - **Frontend App:**
     ```bash
     npm run dev
     # Runs on http://localhost:5173
     ```

---

## 5. Completed Modules & Verification

1. **Authentication & RBAC:**
   - Secure login with JWT issuance, token storage, session validation, and account deactivation support.
   - Distinct Admin vs Accountant vs Employee dashboards and permission gates.
2. **Purchase Order Management:**
   - Multi-item fruit procurement table with automatic subtotal, discount, GST tax, and grand total calculations.
   - Sequential backend-generated numbers (`PO/SF/2026/001`).
   - Workflow states: `DRAFT` $\rightarrow$ `PENDING_APPROVAL` $\rightarrow$ `APPROVED` $\rightarrow$ `OPEN` $\rightarrow$ `CLOSED` (or `REJECTED` with required reason).
   - Official PDF generation directly downloadable from the backend (`GET /api/purchase-orders/:id/pdf`).
3. **Verified Profit & Loss Tracking:**
   - Strictly enforces compliance rule: A PO amount is neither profit nor expense.
   - Computes realized P&L from verified purchase invoice costs, allocated freight/labor, and recognized sales revenue.
   - Color-coded statuses: Profit (Green), Loss (Red), Pending Cost/Sales Data (Orange).
4. **Employee Wages & Salary Management:**
   - Pay period batch generation (e.g., "November 2026", "December 2026").
   - Net payable computation with deductions.
   - Confirmed salary payments with bank transaction references (NEFT/IMPS/UPI) and sequential receipt numbers (`RCP/WAG/2026/XXX`).
5. **Employee Expenses & Reimbursements:**
   - Expense claim submission with categorization (Official Travel, Fuel, Food, Accommodation, Client Meetings, Labor).
   - Receipt and bill upload support (PDF, JPG, PNG).
   - Accountant review and Admin approval/rejection workflows with adjust-amount capability.
6. **Bill Clearance Workbench:**
   - Unified liability clearance table combining approved expense reimbursements and wage dues.
   - Supports full and partial disbursements while retaining historical records.
7. **Accountant Performance Monitoring:**
   - Real-time performance calculations from database operations: POs created, approval velocity, rejection counts, approval rate %, claims reviewed, and audit logs.
8. **Reports & Exports:**
   - Dynamic report center providing instant CSV downloads for Purchase Orders, Wages, Expenses, and P&L.
9. **Activity Logs & Audit History:**
   - Append-only audit logger tracking user actions, entity types, transaction details, and timestamps.
10. **Application Settings:**
    - Persistent configuration of company branding, PO prefixing, wage types, and policy parameters.

