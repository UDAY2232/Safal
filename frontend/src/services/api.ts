const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '') + '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('safal_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    try {
      const data = await response.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    const error: any = new Error(errorMsg);
    error.status = response.status;
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('safal_auth_expired', { detail: { message: errorMsg } }));
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
  createPurchaseOrder: (data: any) => request<any>('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  submitPurchaseOrder: (id: string) => request<any>(`/purchase-orders/${id}/submit`, { method: 'POST' }),
  approvePurchaseOrder: (id: string) => request<any>(`/purchase-orders/${id}/approve`, { method: 'POST' }),
  rejectPurchaseOrder: (id: string, reason: string) =>
    request<any>(`/purchase-orders/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  closePurchaseOrder: (id: string) => request<any>(`/purchase-orders/${id}/close`, { method: 'POST' }),
  updatePOFinancials: (id: string, data: any) =>
    request<any>(`/purchase-orders/${id}/financials`, { method: 'POST', body: JSON.stringify(data) }),
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
};

