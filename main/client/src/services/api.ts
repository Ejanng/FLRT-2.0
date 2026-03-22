// client/src/services/api.ts
const API_BASE_URL = 'http://192.168.1.131:5000';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('admin_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Build headers object properly
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };

  // Add content-type for JSON body
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Merge with any existing headers from options
  if (options.headers) {
    const existingHeaders = options.headers as Record<string, string>;
    Object.assign(headers, existingHeaders);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin';
      throw new Error('Session expired. Please login again.');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

export const statsApi = {
  getDashboard: () => fetchWithAuth('/stats/dashboard'),
  getCategories: () => fetchWithAuth('/stats/reports-by-category'),
};

export const reportsApi = {
  getAll: () => fetchWithAuth('/reports/all-reports'),
  getClaimable: () => fetch(`${API_BASE_URL}/reports/claimable-reports`).then(r => r.json()),
  getById: (id: string) => fetchWithAuth(`/reports/report/${id}`),
  publish: (reportId: number, category: string) => fetchWithAuth('/reports/publish-report', {
    method: 'POST',
    body: JSON.stringify({ report_id: reportId, category }),
  }),
  delete: (reportId: string) => fetchWithAuth(`/reports/delete-report/${reportId}`, {
    method: 'DELETE',
  }),
  contactFinderForFoundReport: (reportId: number, adminNotes: string) =>
    fetchWithAuth(`/found-items/report/${reportId}/contact`, {
      method: 'POST',
      body: JSON.stringify({ admin_notes: adminNotes }),
    }),
  verifyFoundReportCoordination: (reportId: number, adminNotes?: string) =>
    fetchWithAuth(`/found-items/report/${reportId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ admin_notes: adminNotes }),
    }),
  submit: (formData: FormData) => fetch(`${API_BASE_URL}/reports/report-item`, {
    method: 'POST',
    body: formData,
  }).then(r => r.json()),
};

export const claimsApi = {
  getPending: () => fetchWithAuth('/claims/pending-claims'),
  getAll: () => fetchWithAuth('/claims/all-claims'),
  getById: (id: number) => fetchWithAuth(`/claims/claim/${id}`),
  submit: (formData: FormData) => fetch(`${API_BASE_URL}/claims/submit-claim`, {
    method: 'POST',
    body: formData,
  }).then(r => r.json()),
  review: (claimId: number, action: 'approve' | 'reject', adminId: number = 1) => 
    fetchWithAuth(`/claims/review-claim/${claimId}`, {
      method: 'POST',
      body: JSON.stringify({ action, admin_id: adminId }),
    }),
};

export const authApi = {
  login: (email: string, password: string) => 
    fetch(`${API_BASE_URL}/auth/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),
  
  logout: () => fetchWithAuth('/auth/admin-logout', { method: 'POST' }),
};

export const foundItemsApi = {
  getAll: () => fetchWithAuth('/found-items/all'),
  getPending: () => fetchWithAuth('/found-items/pending'),
  getById: (id: number) => fetchWithAuth(`/found-items/${id}`),
  submit: (formData: FormData) => fetchWithAuth('/found-items/submit', {
    method: 'POST',
    body: formData,
  }),
  contact: (foundItemId: number, notes: string) => 
    fetchWithAuth(`/found-items/${foundItemId}/contact`, {
      method: 'POST',
      body: JSON.stringify({ admin_notes: notes }),
    }),
  close: (foundItemId: number, status: 'returned' | 'cancelled') => 
    fetchWithAuth(`/found-items/${foundItemId}/close`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),
};

export const siftApi = {
  train: (gdriveUrl: string) => fetchWithAuth('/sift/train', {
    method: 'POST',
    body: JSON.stringify({ gdrive_url: gdriveUrl }),
  }),
  retrainByStatus: (status: 'lost' | 'found') => fetchWithAuth('/sift/admin/retrain', {
    method: 'POST',
    body: JSON.stringify({ status }),
  }),
  process: (imageUrl: string) => fetchWithAuth('/sift/process', {
    method: 'POST',
    body: JSON.stringify({ image_url: imageUrl }),
  }),
};

export default fetchWithAuth;