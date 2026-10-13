import {
  Brother,
  PrivateNote,
  PersonalTransaction,
  PrivateTask,
  SharedIncome,
  SharedTask,
  FamilyPlan,
  FamilyAnnouncement,
  DashboardOverview
} from '../types/index.ts';

const TOKEN_KEY = '4broters_session_token';
const USER_KEY = '4broters_user_profile';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  remove: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getUser: (): Brother | null => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser: (user: Brother) => localStorage.setItem(USER_KEY, JSON.stringify(user))
};

export function getWhatsAppUrl(phoneNumber: string | null | undefined, message: string): string | null {
  if (!phoneNumber) return null;
  // Clean phone number: remove non-digits
  let clean = phoneNumber.replace(/[^0-9]/g, '');
  // If Pakistan local format starting with 03 (e.g. 03109796509 -> 923109796509)
  if (clean.startsWith('03') && clean.length === 11) {
    clean = '92' + clean.slice(1);
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers = new Headers(options.headers || {});

  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  auth: {
    getFamilyMembers: () => apiRequest<Brother[]>('/api/family/members'),
    login: async (emailOrKey: string, password: string): Promise<{ token: string; user: Brother }> => {
      const result = await apiRequest<{ token: string; user: Brother }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ emailOrKey, password })
      });
      tokenStorage.set(result.token);
      tokenStorage.setUser(result.user);
      return result;
    },
    getMe: () => apiRequest<{ user: Brother }>('/api/auth/me'),
    logout: async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } finally {
        tokenStorage.remove();
      }
    },
    changePassword: (currentPassword: string, newPassword: string) =>
      apiRequest<{ success: boolean; message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      }),
    updateProfile: async (data: { email?: string; avatar_url?: string | null; phone_number?: string; full_name?: string }) => {
      const res = await apiRequest<{ success: boolean; message: string; user: Brother }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      if (res.user) {
        tokenStorage.setUser(res.user);
      }
      return res;
    }
  },

  dashboard: {
    getOverview: () => apiRequest<DashboardOverview>('/api/dashboard/overview')
  },

  privateNotes: {
    getAll: () => apiRequest<PrivateNote[]>('/api/private/notes'),
    create: (data: Partial<PrivateNote>) =>
      apiRequest<PrivateNote>('/api/private/notes', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<PrivateNote>) =>
      apiRequest<PrivateNote>(`/api/private/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/private/notes/${id}`, {
        method: 'DELETE'
      })
  },

  privateMoney: {
    getAll: () => apiRequest<PersonalTransaction[]>('/api/private/money'),
    getSummary: () =>
      apiRequest<{
        totalIncome: number;
        totalExpense: number;
        netBalance: number;
        currency: string;
        categoryBreakdown: any[];
      }>('/api/private/money/summary'),
    create: (data: Partial<PersonalTransaction>) =>
      apiRequest<PersonalTransaction>('/api/private/money', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<PersonalTransaction>) =>
      apiRequest<PersonalTransaction>(`/api/private/money/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/private/money/${id}`, {
        method: 'DELETE'
      })
  },

  privateTasks: {
    getAll: () => apiRequest<PrivateTask[]>('/api/private/tasks'),
    create: (data: Partial<PrivateTask>) =>
      apiRequest<PrivateTask>('/api/private/tasks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<PrivateTask>) =>
      apiRequest<PrivateTask>(`/api/private/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    toggleStatus: (id: string, status: 'pending' | 'completed') =>
      apiRequest<PrivateTask>(`/api/private/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/private/tasks/${id}`, {
        method: 'DELETE'
      })
  },

  sharedIncome: {
    getAll: () => apiRequest<SharedIncome[]>('/api/shared/income'),
    getSummary: () =>
      apiRequest<{
        total: number;
        count: number;
        currency: string;
        categories: any[];
      }>('/api/shared/income/summary'),
    create: (data: Partial<SharedIncome>) =>
      apiRequest<SharedIncome>('/api/shared/income', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<SharedIncome>) =>
      apiRequest<SharedIncome>(`/api/shared/income/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/shared/income/${id}`, {
        method: 'DELETE'
      })
  },

  sharedTasks: {
    getAll: () => apiRequest<SharedTask[]>('/api/shared/tasks'),
    create: (data: Partial<SharedTask>) =>
      apiRequest<SharedTask>('/api/shared/tasks', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<SharedTask>) =>
      apiRequest<SharedTask>(`/api/shared/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    toggleStatus: (id: string, status: 'pending' | 'completed') =>
      apiRequest<SharedTask>(`/api/shared/tasks/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/shared/tasks/${id}`, {
        method: 'DELETE'
      })
  },

  familyPlans: {
    getAll: () => apiRequest<FamilyPlan[]>('/api/shared/plans'),
    create: (data: Partial<FamilyPlan>) =>
      apiRequest<FamilyPlan>('/api/shared/plans', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<FamilyPlan>) =>
      apiRequest<FamilyPlan>(`/api/shared/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/shared/plans/${id}`, {
        method: 'DELETE'
      })
  },

  announcements: {
    getAll: () => apiRequest<FamilyAnnouncement[]>('/api/shared/announcements'),
    create: (data: Partial<FamilyAnnouncement>) =>
      apiRequest<FamilyAnnouncement>('/api/shared/announcements', {
        method: 'POST',
        body: JSON.stringify(data)
      }),
    update: (id: string, data: Partial<FamilyAnnouncement>) =>
      apiRequest<FamilyAnnouncement>(`/api/shared/announcements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      }),
    delete: (id: string) =>
      apiRequest<{ success: boolean }>(`/api/shared/announcements/${id}`, {
        method: 'DELETE'
      })
  },

  admin: {
    clearExamples: () =>
      apiRequest<{ success: boolean; message: string }>('/api/admin/clear-examples', {
        method: 'POST'
      }),
    restoreExamples: () =>
      apiRequest<{ success: boolean; message: string }>('/api/admin/restore-examples', {
        method: 'POST'
      })
  }
};
