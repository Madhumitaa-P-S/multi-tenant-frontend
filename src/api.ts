// API Configuration and Service Functions
// API Configuration and Service Functions
// Use import.meta.env during development and process.env during build
const API_URL = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') || '';

// Rest of your api.ts file remains the same...
export type LoginResponse = {
  token: string;
  user: {
    email: string;
    role: 'admin' | 'member';
    tenant: {
      slug: string;
      name: string;
      plan: 'free' | 'pro';
    };
  };
};

export type Note = {
  id: number;
  title: string;
  content: string;
  user_id: number;
  created_at: string;
  updated_at?: string;
};

export type ApiError = {
  error: string;
  message?: string;
};

// Authentication helpers
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || data.message || `HTTP ${response.status}`);
    // Attach additional error info for special handling
    (error as any).status = response.status;
    (error as any).code = data.error;
    throw error;
  }

  return data;
}

// Authentication API
export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Notes API
export async function getNotes(): Promise<Note[]> {
  return apiRequest<Note[]>('/notes');
}

export async function getNote(id: number): Promise<Note> {
  return apiRequest<Note>(`/notes/${id}`);
}

export async function createNote(title: string, content: string): Promise<Note> {
  try {
    return await apiRequest<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  } catch (error: any) {
    // Handle note limit specifically
    if (error.status === 402 || error.code === 'note_limit_reached') {
      const limitError = new Error(error.message || 'Note limit reached');
      (limitError as any).code = 'NOTE_LIMIT';
      throw limitError;
    }
    throw error;
  }
}

export async function updateNote(
  id: number,
  title?: string,
  content?: string
): Promise<Note> {
  return apiRequest<Note>(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title, content }),
  });
}

export async function deleteNote(id: number): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/notes/${id}`, {
    method: 'DELETE',
  });
}

// Tenant API
export async function upgradeTenant(slug: string): Promise<{ success: boolean; plan: string }> {
  return apiRequest<{ success: boolean; plan: string }>(`/tenants/${slug}/upgrade`, {
    method: 'POST',
  });
}

export async function inviteUser(
  slug: string,
  email: string,
  role: 'admin' | 'member'
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/tenants/${slug}/invite`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

// Utility functions
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('token');
}

export function getUserData() {
  return {
    role: localStorage.getItem('role') as 'admin' | 'member' | null,
    tenantSlug: localStorage.getItem('tenantSlug') || '',
    tenantName: localStorage.getItem('tenantName') || '',
    plan: localStorage.getItem('plan') as 'free' | 'pro' | null,
    email: localStorage.getItem('email') || '',
  };
}

export function logout() {
  localStorage.clear();
}
