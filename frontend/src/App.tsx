import React, { useState, useEffect } from 'react';
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
import { AttendancePage } from './pages/AttendancePage';
import { VendorDashboardPage } from './pages/VendorDashboardPage';
import { VendorsAdminPage } from './pages/VendorsAdminPage';
import { CreatePOModal } from './components/CreatePOModal';
import { MobileBottomNav } from './components/MobileBottomNav';

function MainApp() {
  const { user, token, isLoading, logout } = useAuth();
  const [activePage, setActivePage] = useState('Dashboard');
  const [pageHistory, setPageHistory] = useState<string[]>(['Dashboard']);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('safal_sidebar_collapsed');
    if (saved !== null) return saved === 'true';
    return typeof window !== 'undefined' && window.innerWidth < 1100;
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
    // If an employee attempts to navigate to 'Purchase Order (PO)', reroute to 'Customer Due (CD)'
    const targetPage = (user?.role === 'EMPLOYEE' && page === 'Purchase Order (PO)') ? 'Customer Due (CD)' : page;
    setPageHistory((prev) => (prev[prev.length - 1] === targetPage ? prev : [...prev, targetPage]));
    try {
      window.history.pushState({ page: targetPage }, '', window.location.pathname);
    } catch {}
    setActivePage(targetPage);
    setIsSidebarOpen(false);
  };

  const goBack = () => {
    if (isSidebarOpen) {
      setIsSidebarOpen(false);
      return;
    }
    if (showCreatePO) {
      setShowCreatePO(false);
      return;
    }
    if (pageHistory.length > 1) {
      const updated = [...pageHistory];
      updated.pop();
      const prevPage = updated[updated.length - 1] || 'Dashboard';
      setPageHistory(updated);
      setActivePage(prevPage);
    } else if (activePage !== 'Dashboard') {
      setPageHistory(['Dashboard']);
      setActivePage('Dashboard');
    } else {
      // User is on Dashboard and pressed Back: ask confirmation to return to login screen
      if (window.confirm('Do you want to log out and return to the login screen?')) {
        logout();
      }
    }
  };

  // Browser physical / swipe Back button handler (popstate)
  useEffect(() => {
    try {
      if (!window.history.state || !window.history.state.page) {
        window.history.replaceState({ page: 'Dashboard' }, '', window.location.pathname);
      }
    } catch {}

    const handlePopState = () => {
      if (isSidebarOpen) {
        setIsSidebarOpen(false);
        try {
          window.history.pushState({ page: activePage }, '', window.location.pathname);
        } catch {}
        return;
      }
      if (showCreatePO) {
        setShowCreatePO(false);
        try {
          window.history.pushState({ page: activePage }, '', window.location.pathname);
        } catch {}
        return;
      }

      if (pageHistory.length > 1) {
        const updated = [...pageHistory];
        updated.pop();
        const prevPage = updated[updated.length - 1] || 'Dashboard';
        setPageHistory(updated);
        setActivePage(prevPage);
      } else if (activePage !== 'Dashboard') {
        setPageHistory(['Dashboard']);
        setActivePage('Dashboard');
      } else {
        if (window.confirm('Do you want to log out and return to the login screen?')) {
          logout();
        } else {
          try {
            window.history.pushState({ page: 'Dashboard' }, '', window.location.pathname);
          } catch {}
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isSidebarOpen, showCreatePO, pageHistory, activePage, logout]);

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
        onGoBack={goBack}
        canGoBack={true}
        activePage={activePage}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebarCollapsed}
        onOpenMobileMenu={() => setIsSidebarOpen(true)}
      />

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close menu"
          role="button"
          tabIndex={0}
        />
      )}

      <div className="app-body">
        <Sidebar
          activePage={activePage}
          onNavigate={navigate}
          isOpen={isSidebarOpen}
          close={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={toggleSidebarCollapsed}
        />

        <main className={`main-content ${isSidebarCollapsed ? 'main-content-collapsed' : ''}`}>
          {user?.role !== 'VENDOR' &&
            activePage !== 'Purchase Order (PO)' &&
            activePage !== 'Customer Due (CD)' &&
            activePage !== 'Vendors (KYC)' &&
            activePage !== 'Dashboard' &&
            activePage !== 'Attendance' && (
            <PageHeading
              page={activePage}
              onAction={() => {
                if (activePage === 'Dashboard') {
                  setShowCreatePO(true);
                }
              }}
            />
          )}

          {/* Primary View: Dashboard or Vendor Specialized Views (Kept persistently mounted for 0ms instantaneous tab switching) */}
          <div
            style={{
              display:
                activePage === 'Dashboard' ||
                (user?.role === 'VENDOR' &&
                  (activePage === 'Supply Consignments' ||
                    activePage === 'Ready for Dispatch' ||
                    activePage === 'Weighbridge & QC Slips' ||
                    activePage === 'Profile' ||
                    activePage === 'Vendor Profile'))
                  ? 'block'
                  : 'none',
            }}
          >
            {user?.role === 'VENDOR' ? (
              <VendorDashboardPage
                onNotify={notify}
                onCreatePO={() => setShowCreatePO(true)}
                activePage={activePage}
                onNavigate={navigate}
              />
            ) : (
              <DashboardPage onNavigate={navigate} onCreatePO={() => setShowCreatePO(true)} />
            )}
          </div>
          {activePage === 'Attendance' && user?.role !== 'VENDOR' && <AttendancePage user={user} />}
          {/* Purchase Order (PO) and Customer Due (CD) Management */}
          {(activePage === 'Purchase Order (PO)' || activePage === 'Customer Due (CD)') && (
            <PurchaseOrdersPage
              key={user?.role === 'EMPLOYEE' || activePage === 'Customer Due (CD)' ? 'cd-page' : 'po-page'}
              mode={user?.role === 'EMPLOYEE' || activePage === 'Customer Due (CD)' ? 'CD' : 'PO'}
              onNotify={notify}
              showCreateModal={showCreatePO}
              setShowCreateModal={setShowCreatePO}
            />
          )}
          {activePage === 'Invoices' && user?.role !== 'EMPLOYEE' && user?.role !== 'VENDOR' && <InvoicesPage onNotify={notify} />}
          {activePage === 'Employee Expenses' && user?.role !== 'VENDOR' && <ExpensesPage onNotify={notify} />}
          {activePage === 'Bill Clearance' && user?.role !== 'EMPLOYEE' && user?.role !== 'VENDOR' && <ClearancePage onNotify={notify} />}
          {activePage === 'Wages & Salary' && user?.role === 'ADMIN' && <WagesPage onNotify={notify} />}
          {activePage === 'Employees' && user?.role === 'ADMIN' && <EmployeesPage onNotify={notify} />}
          {activePage === 'Vendors (KYC)' && (user?.role === 'ADMIN' || user?.role === 'ACCOUNTANT') && (
            <VendorsAdminPage onNotify={notify} />
          )}
          {activePage === 'Suppliers' && user?.role !== 'EMPLOYEE' && user?.role !== 'VENDOR' && <SuppliersPage onNotify={notify} />}
          {activePage === 'Reports' && user?.role !== 'EMPLOYEE' && user?.role !== 'VENDOR' && <ReportsPage onNotify={notify} />}
          {activePage === 'Accountant Performance' && <PerformancePage />}
          {activePage === 'Activity Logs' && <ActivityLogsPage />}
          {activePage === 'Settings' && <SettingsPage onNotify={notify} />}
        </main>
      </div>

      <MobileBottomNav
        activePage={activePage}
        onNavigate={navigate}
        onOpenMenu={() => setIsSidebarOpen(true)}
      />

      {/* Global Create PO / CD Modal - opens instantly from any page (Dashboard, PO, etc.) */}
      {showCreatePO && (
        <CreatePOModal
          mode={activePage === 'Customer Due (CD)' || user?.role === 'EMPLOYEE' ? 'CD' : 'PO'}
          onClose={() => setShowCreatePO(false)}
          onSuccess={(msg) => {
            setShowCreatePO(false);
            const isCDContext = activePage === 'Customer Due (CD)' || user?.role === 'EMPLOYEE';
            notify(msg || (isCDContext ? 'Customer Due (CD) created successfully' : 'Purchase Order created successfully'));
            if (isCDContext) {
              if (activePage !== 'Customer Due (CD)') {
                setActivePage('Customer Due (CD)');
              }
            } else {
              if (activePage !== 'Purchase Order (PO)') {
                setActivePage('Purchase Order (PO)');
              }
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
