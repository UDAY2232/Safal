import React, { useState } from 'react';
import { Menu, CheckCircle2, Home, ShoppingCart, Users, Truck, ReceiptIndianRupee, WalletCards } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ClearancePage } from './pages/ClearancePage';
import { WagesPage } from './pages/WagesPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ReportsPage } from './pages/ReportsPage';
import { PerformancePage } from './pages/PerformancePage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CreatePOModal } from './components/CreatePOModal';

function MainApp() {
  const { user, token, isLoading } = useAuth();
  const [activePage, setActivePage] = useState('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('safal_sidebar_collapsed') === 'true';
  });
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [toast, setToast] = useState('');

  const toggleSidebarCollapsed = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('safal_sidebar_collapsed', String(next));
      return next;
    });
  };

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const navigate = (page: string) => {
    setActivePage(page);
    setIsSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F8F4] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#087A3E] mx-auto mb-3" />
          <p className="text-xs font-bold text-[#064D2B] tracking-wider uppercase">Loading SAFAL System...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <LoginPage />;
  }

  return (
    <div className="app-shell">
      <Header
        onNavigate={navigate}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebarCollapsed}
      />

      <button
        className="mobile-menu-button"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {isSidebarOpen && (
        <button
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close menu"
        />
      )}

      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        isOpen={isSidebarOpen}
        close={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={toggleSidebarCollapsed}
      />

      <main className={`main-content ${isSidebarCollapsed ? 'main-content-collapsed' : ''}`}>
        {activePage !== 'Purchase Order (PO)' && activePage !== 'Dashboard' && (
          <PageHeading
            page={activePage}
            onAction={() => {
              if (activePage === 'Dashboard') {
                setShowCreatePO(true);
              }
            }}
          />
        )}

        {activePage === 'Dashboard' && (
          <DashboardPage onNavigate={navigate} onCreatePO={() => setShowCreatePO(true)} />
        )}
        {activePage === 'Purchase Order (PO)' && (
          <PurchaseOrdersPage
            onNotify={notify}
            showCreateModal={showCreatePO}
            setShowCreateModal={setShowCreatePO}
          />
        )}
        {activePage === 'Invoices' && <InvoicesPage onNotify={notify} />}
        {activePage === 'Employee Expenses' && <ExpensesPage onNotify={notify} />}
        {activePage === 'Bill Clearance' && <ClearancePage onNotify={notify} />}
        {activePage === 'Wages & Salary' && user?.role === 'ADMIN' && <WagesPage onNotify={notify} />}
        {activePage === 'Employees' && <EmployeesPage onNotify={notify} />}
        {activePage === 'Suppliers' && <SuppliersPage onNotify={notify} />}
        {activePage === 'Reports' && <ReportsPage onNotify={notify} />}
        {activePage === 'Accountant Performance' && <PerformancePage />}
        {activePage === 'Activity Logs' && <ActivityLogsPage />}
        {activePage === 'Settings' && <SettingsPage onNotify={notify} />}
      </main>

      {/* Global Create PO Modal - opens instantly from any page (Dashboard, PO, etc.) */}
      {showCreatePO && (
        <CreatePOModal
          onClose={() => setShowCreatePO(false)}
          onSuccess={(msg) => {
            setShowCreatePO(false);
            notify(msg || 'Purchase Order created successfully');
            if (activePage !== 'Purchase Order (PO)') {
              setActivePage('Purchase Order (PO)');
            }
          }}
        />
      )}

      {toast && (
        <div className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
    </div>
  );
}

function PageHeading({ page, onAction }: { page: string; onAction: () => void }) {
  const subtitles: Record<string, string> = {
    Dashboard: 'Consolidated overview of fruit procurement, workforce wages, and realized performance.',
    'Purchase Order (PO)': 'Create, review, approve, and track fruit procurement orders with verified P&L.',
    Invoices: 'Generate, track, and clear domestic and international export/import tax invoices.',
    'Employee Expenses': 'Submit and audit company-related spending, travel, logistics, and reimbursements.',
    'Bill Clearance': 'Disburse authorized expense claims and employee wages with complete transaction records.',
    'Wages & Salary': 'Manage pay periods, authorized deductions, and traceable bank salary disbursements.',
    Employees: 'Maintain active personnel, wage structures, and historical earnings.',
    Suppliers: 'Maintain fruit producer directories, commercial terms, and procurement volume.',
    Reports: 'Download compliant CSV and PDF financial performance statements.',
    'Accountant Performance': 'Audit accountant activity throughput, turnaround velocity, and compliance rates.',
    'Activity Logs': 'Tamper-proof append-only record of all critical company operations.',
    Settings: 'Configure company branding, numbering formats, and policy parameters.',
  };

  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-line" /> SAFAL ENTERPRISE PLATFORM
        </div>
        <h1>{page}</h1>
        <p>{subtitles[page] || `Manage ${page.toLowerCase()} across SAFAL operations.`}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
