import { compressImageFile } from '../utils/imageUtils';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('safal_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Universal Image Auto-Compression Guard:
  // If sending FormData with any image larger than 300KB, automatically compress it
  // on the client before network transmission to permanently prevent HTTP 413 (Request Entity Too Large).
  if (options.body instanceof FormData && typeof (options.body as any).entries === 'function') {
    try {
      const optimizedFormData = new FormData();
      for (const [key, value] of (options.body as any).entries()) {
        if (value instanceof File && value.type.startsWith('image/') && value.size > 300 * 1024) {
          try {
            const compressed = await compressImageFile(value);
            optimizedFormData.append(key, compressed);
          } catch {
            optimizedFormData.append(key, value);
          }
        } else {
          optimizedFormData.append(key, value);
        }
      }
      options.body = optimizedFormData;
    } catch {
      // Fallback to original body if FormData iteration fails
    }
  }

  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {}),
  } as Record<string, string>;

  // Don't set Content-Type if sending FormData (let browser set multipart boundary)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    let data: any = null;
    try {
      data = await response.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    if (response.status === 413) {
      errorMsg = 'File or image payload is too large. Image auto-compression has been enabled.';
    }
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('safal_auth_expired', { detail: { message: errorMsg } }));
    }
    if (
      response.status === 403 &&
      (data?.underMaintenance ||
        data?.error === 'SERVER_UNDER_MAINTENANCE' ||
        errorMsg.toLowerCase().includes('maintenance') ||
        errorMsg.toLowerCase().includes('suspended'))
    ) {
      window.dispatchEvent(
        new CustomEvent('safal_server_maintenance', {
          detail: { message: errorMsg, isSuspended: true, data },
        })
      );
    }
    throw error;
  }

  // Handle CSV/text responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return (await response.text()) as unknown as T;
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),
  logout: () => request<any>('/auth/logout', { method: 'POST' }),
  resetPassword: (data: any) => request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),

  // Admin
  getAdminDashboard: () => request<any>('/admin/dashboard'),
  getAccountants: () => request<any[]>('/admin/accountants'),
  createAccountant: (data: any) => request<any>('/admin/accountants', { method: 'POST', body: JSON.stringify(data) }),
  updateAccountant: (id: string, data: any) => request<any>(`/admin/accountants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleAccountantStatus: (id: string, status?: string) =>
    request<any>(`/admin/accountants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getAccountantPerformance: () => request<any>('/admin/accountant-performance'),
  getActivityLogs: (params: string = '') => request<any>(`/admin/activity-logs${params}`),

  // Suppliers
  getSuppliers: (params: string = '') => request<any[]>(`/suppliers${params}`),
  getSupplierById: (id: string) => request<any>(`/suppliers/${id}`),
  createSupplier: (data: any) => request<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (id: string, data: any) => request<any>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Purchase Orders
  getPurchaseOrders: (params: string = '') => request<any[]>(`/purchase-orders${params}`),
  getPurchaseOrderById: (id: string) => request<any>(`/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
    return request<any>('/purchase-orders', {
      method: 'POST',
      body: isForm ? data : JSON.stringify(data),
    });
  },
  submitPurchaseOrder: (id: string) => request<any>(`/purchase-orders/${id}/submit`, { method: 'POST' }),
  approvePurchaseOrder: (id: string) => request<any>(`/purchase-orders/${id}/approve`, { method: 'POST' }),
  rejectPurchaseOrder: (id: string, reason: string) =>
    request<any>(`/purchase-orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  closePurchaseOrder: (id: string) => request<any>(`/purchase-orders/${id}/close`, { method: 'POST' }),
  updatePurchaseOrder: (id: string, data: any) => request<any>(`/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePurchaseOrder: (id: string) => request<any>(`/purchase-orders/${id}`, { method: 'DELETE' }),
  createDuePurchaseOrder: (data: any) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
    return request<any>('/purchase-orders/due-orders', {
      method: 'POST',
      body: isForm ? data : JSON.stringify(data),
    });
  },
  updatePOFinancials: (id: string, data: any) =>
    request<any>(`/purchase-orders/${id}/financials`, { method: 'POST', body: JSON.stringify(data) }),
  recordDuePayment: (id: string, data: FormData | {
    amount?: number;
    paymentMode?: string;
    reference?: string;
    notes?: string;
    markClosed?: boolean;
    newAdvanceAmount?: number;
    newPendingAmount?: number;
    proofNotes?: string;
  }) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
    return request<any>(`/purchase-orders/${id}/due-payment`, {
      method: 'POST',
      body: isForm ? data : JSON.stringify(data),
    });
  },
  downloadPOPDFUrl: (id: string) => {
    const token = localStorage.getItem('safal_token') || '';
    return `${API_BASE}/purchase-orders/${id}/pdf?token=${encodeURIComponent(token)}`;
  },
  downloadPurchaseOrderPDF: async (id: string, poNumber?: string): Promise<void> => {
    const token = localStorage.getItem('safal_token');
    const res = await fetch(`${API_BASE}/purchase-orders/${id}/pdf`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      let errorMsg = 'Failed to download Purchase Order PDF';
      try {
        const data = await res.json();
        errorMsg = data.error || data.message || errorMsg;
      } catch {
        errorMsg = `${res.status} ${res.statusText}`;
      }
      throw new Error(errorMsg);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanNumber = (poNumber || id).replace(/[\/\\]/g, '_');
    a.download = `PurchaseOrder-${cleanNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  },

  // Employees
  getEmployees: (params: string = '') => request<any>(`/employees${params}`),
  getEmployeeById: (id: string) => request<any>(`/employees/${id}`),
  createEmployee: (data: any) => request<any>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: string, data: any) => request<any>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleEmployeeStatus: (id: string) => request<any>(`/employees/${id}/status`, { method: 'PATCH' }),
  deleteEmployee: (id: string) => request<any>(`/employees/${id}`, { method: 'DELETE' }),

  // Wages
  getWages: (params: string = '') => request<any>(`/wages${params}`),
  getMySalary: () => request<{ hasProfile: boolean; mySalary: any }>('/wages/my-salary'),
  generateWagePeriod: (payPeriod: string) =>
    request<any>('/wages/generate-period', { method: 'POST', body: JSON.stringify({ payPeriod }) }),
  recordWagePayment: (id: string, data: any) =>
    request<any>(`/wages/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: (params: string = '') => request<any>(`/expenses${params}`),
  getExpenseById: (id: string) => request<any>(`/expenses/${id}`),
  submitExpense: (formData: FormData) => request<any>('/expenses', { method: 'POST', body: formData }),
  reviewExpense: (id: string, notes?: string) =>
    request<any>(`/expenses/${id}/review`, { method: 'POST', body: JSON.stringify({ notes }) }),
  approveExpense: (id: string, data: { approvedAmount?: number; reason?: string }) =>
    request<any>(`/expenses/${id}/approve`, { method: 'POST', body: JSON.stringify(data) }),
  rejectExpense: (id: string, reason: string) =>
    request<any>(`/expenses/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  recordExpensePayment: (id: string, data: any) =>
    request<any>(`/expenses/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  requestExpenseReceipt: (id: string) =>
    request<any>(`/expenses/${id}/request-receipt`, { method: 'POST' }),
  notifyAllMissingReceipts: () =>
    request<any>('/expenses/notify-missing-receipts', { method: 'POST' }),
  uploadExpenseReceipt: (id: string, formData: FormData) =>
    request<any>(`/expenses/${id}/receipt`, { method: 'POST', body: formData }),

  // Clearance
  getClearanceBills: (params: string = '') => request<any>(`/clearance/bills${params}`),
  clearBillPayment: (data: any) => request<any>('/clearance/record-payment', { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  downloadReportCSV: async (type: string): Promise<void> => {
    const token = localStorage.getItem('safal_token');
    const res = await fetch(`${API_BASE}/reports/${type}?format=csv`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAFAL_${type}_report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  // Notifications
  getNotifications: () => request<any>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => request<any>('/notifications/mark-all-read', { method: 'POST' }),
  sendNotice: (data: { target: 'ALL' | 'EMPLOYEES' | 'USER'; targetUserId?: string; title: string; message: string; type?: string }) =>
    request<any>('/notifications/send', { method: 'POST', body: JSON.stringify(data) }),

  // Settings & System
  getSettings: () => request<any>('/settings'),
  updateSettings: (data: any) => request<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getSystemStatus: () => request<any>('/system/status'),

  // Invoices
  getInvoices: (params: string = '') => request<{ invoices: any[]; stats: any }>(`/invoices${params}`),
  getInvoiceById: (id: string) => request<any>(`/invoices/${id}`),
  createInvoice: (data: any) => request<any>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  recordInvoicePayment: (id: string, data: any) =>
    request<any>(`/invoices/${id}/payment`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) => request<{ message: string }>(`/invoices/${id}`, { method: 'DELETE' }),

  // Attendance
  clockInAttendance: (data?: any) => {
    if (data instanceof FormData) {
      return request<any>('/attendance/clock-in', { method: 'POST', body: data });
    }
    return request<any>('/attendance/clock-in', {
      method: 'POST',
      body: data ? JSON.stringify(data) : JSON.stringify({}),
    });
  },
  clockOutAttendance: (data?: any) => {
    if (data instanceof FormData) {
      return request<any>('/attendance/clock-out', { method: 'POST', body: data });
    }
    return request<any>('/attendance/clock-out', {
      method: 'POST',
      body: data ? JSON.stringify(data) : JSON.stringify({}),
    });
  },
  getTodayAttendance: () => request<any>('/attendance/today'),
  getMyAttendanceHistory: () => request<any>('/attendance/my-history'),
  getAllAttendance: (params: string = '') => request<any>(`/attendance/all${params}`),

  // Vendor Operations
  getVendorProfile: () => request<{ vendor: any }>('/vendor/profile'),
  updateVendorProfile: (data: any) => request<any>('/vendor/profile', { method: 'PUT', body: JSON.stringify(data) }),
  getVendorPOs: () => request<any[]>('/vendor/purchase-orders'),
  createVendorSupplyPO: (formData: FormData) =>
    request<any>('/vendor/supply-po', { method: 'POST', body: formData }),
  submitPODispatch: (formData: FormData) => request<any>('/vendor/dispatch', { method: 'POST', body: formData }),
  getVendorDashboardStats: () => request<any>('/vendor/dashboard-stats'),
  submitHubQCInspection: (poId: string, formData: FormData) =>
    request<any>(`/vendor/po/${poId}/qc-inspection`, { method: 'POST', body: formData }),

  // Admin Vendor Management
  getAllVendors: () => request<any[]>('/vendor/admin/all'),
  getVendorOperationsForAdmin: () => request<any[]>('/vendor/admin/operations'),
  createVendor: (data: any) => request<any>('/vendor/admin/create', { method: 'POST', body: JSON.stringify(data) }),
  toggleVendorKycLock: (id: string) => request<any>(`/vendor/admin/${id}/toggle-lock`, { method: 'PATCH' }),
  updateVendorByAdmin: (id: string, data: any) =>
    request<any>(`/vendor/admin/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  disburseVendorAdvance: (poId: string, formData: FormData) =>
    request<any>(`/vendor/admin/po/${poId}/disburse-advance`, { method: 'POST', body: formData }),
  settleVendorBalance: (poId: string, formData: FormData) =>
    request<any>(`/vendor/admin/po/${poId}/settle-balance`, { method: 'POST', body: formData }),
  allotVendorPOVehicle: (
    poId: string,
    data: FormData | {
      dispatchVehicleNumber: string;
      transporterName?: string;
      driverPhone?: string;
      allotmentNotes?: string;
      biltyFile?: File;
    }
  ) => {
    const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
    return request<any>(`/vendor/admin/po/${poId}/allot-vehicle`, {
      method: 'POST',
      body: isForm ? data : JSON.stringify(data),
    });
  },
};

