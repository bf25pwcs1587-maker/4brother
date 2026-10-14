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
import { localDb, INITIAL_BROTHERS } from './storage.ts';

const TOKEN_KEY = '4broters_session_token';
const USER_KEY = '4broters_user_profile';

export const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {}
  },
  remove: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  },
  getUser: (): Brother | null => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser: (user: Brother) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  }
};

export function getWhatsAppUrl(phoneNumber: string | null | undefined, message: string): string | null {
  if (!phoneNumber) return null;
  let clean = phoneNumber.replace(/[^0-9]/g, '');
  if (clean.startsWith('03') && clean.length === 11) {
    clean = '92' + clean.slice(1);
  }
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export const FALLBACK_BROTHERS: Brother[] = INITIAL_BROTHERS;

function getCurrentUserFallback(): Brother {
  const current = tokenStorage.getUser();
  if (current) return current;
  const brothers = localDb.getBrothers();
  return brothers[0];
}

async function apiRequest<T>(url: string, options: RequestInit = {}, retries = 1): Promise<T> {
  let token = tokenStorage.get();
  if (!token) {
    const user = tokenStorage.getUser();
    if (user?.brother_key) {
      token = user.brother_key;
    }
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
  } catch (netErr: any) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, 200));
      return apiRequest<T>(url, options, retries - 1);
    }
    throw new Error('Network error or server unreachable: ' + (netErr.message || 'Failed to fetch'));
  }

  // Detect HTML response (e.g. Vercel SPA rewrites returning index.html for 404 API paths)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error(`API endpoint ${url} returned HTML (serverless or route not found).`);
  }

  if (response.status === 404) {
    throw new Error(`API endpoint ${url} not found (404)`);
  }

  // Handle 401 re-auth
  if (response.status === 401 && retries > 0 && !url.includes('/api/auth/login')) {
    const user = tokenStorage.getUser();
    if (user?.brother_key) {
      try {
        const customPass = localStorage.getItem(`4broters_custom_pass_${user.brother_key}`) || `${user.brother_key}2026`;
        const reauthRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailOrKey: user.brother_key, password: customPass })
        });
        if (reauthRes.ok) {
          const reauthData = await reauthRes.json();
          tokenStorage.set(reauthData.token);
          tokenStorage.setUser(reauthData.user);
          return apiRequest<T>(url, options, retries - 1);
        }
      } catch {}
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || data === null) {
    const message = (data && (data.error || data.message)) || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  auth: {
    getFamilyMembers: async (): Promise<Brother[]> => {
      try {
        const brothers = await apiRequest<Brother[]>('/api/family/members');
        if (Array.isArray(brothers) && brothers.length > 0) {
          return brothers;
        }
        return localDb.getBrothers();
      } catch {
        return localDb.getBrothers();
      }
    },

    login: async (emailOrKey: string, password: string): Promise<{ token: string; user: Brother }> => {
      try {
        const result = await apiRequest<{ token: string; user: Brother }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ emailOrKey, password })
        });
        if (result && result.token && result.user) {
          tokenStorage.set(result.token);
          tokenStorage.setUser(result.user);
          return result;
        }
      } catch (err: any) {
        // Fall back to local database authentication
        const brothers = localDb.getBrothers();
        const trimmed = emailOrKey.trim().toLowerCase();
        const brother = brothers.find(
          b =>
            b.brother_key.toLowerCase() === trimmed ||
            b.email.toLowerCase() === trimmed ||
            b.full_name.toLowerCase().includes(trimmed)
        );

        if (brother && localDb.verifyPassword(brother.brother_key, password)) {
          const fallback = {
            token: `local_session_${brother.brother_key}_${Date.now()}`,
            user: brother
          };
          tokenStorage.set(fallback.token);
          tokenStorage.setUser(fallback.user);
          return fallback;
        }

        // If credentials invalid according to localDb
        if (brother) {
          throw new Error('Incorrect passcode for ' + brother.full_name + '. Default is ' + brother.brother_key + '2026.');
        }
        throw new Error('Brother or email not recognized.');
      }

      throw new Error('Login failed.');
    },

    getMe: async (): Promise<{ user: Brother }> => {
      try {
        const res = await apiRequest<{ user: Brother }>('/api/auth/me');
        if (res && res.user) {
          tokenStorage.setUser(res.user);
          return res;
        }
      } catch {}
      const stored = tokenStorage.getUser() || getCurrentUserFallback();
      return { user: stored };
    },

    logout: async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch {}
      tokenStorage.remove();
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      const current = getCurrentUserFallback();
      try {
        const res = await apiRequest<{ success: boolean; message: string }>('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ currentPassword, newPassword })
        });
        localDb.setPassword(current.brother_key, newPassword);
        return res;
      } catch {
        if (!localDb.verifyPassword(current.brother_key, currentPassword)) {
          throw new Error('Current passcode is incorrect.');
        }
        localDb.setPassword(current.brother_key, newPassword);
        return { success: true, message: 'Passcode updated successfully.' };
      }
    },

    updateProfile: async (data: { email?: string; avatar_url?: string | null; phone_number?: string; full_name?: string }) => {
      const current = getCurrentUserFallback();
      try {
        const res = await apiRequest<{ success: boolean; message: string; user: Brother }>('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (res && res.user) {
          tokenStorage.setUser(res.user);
          localDb.updateBrother(res.user.id, res.user);
          return res;
        }
      } catch {}
      const updated = localDb.updateBrother(current.id, data);
      tokenStorage.setUser(updated);
      return { success: true, message: 'Profile saved successfully.', user: updated };
    }
  },

  dashboard: {
    getOverview: async (): Promise<DashboardOverview> => {
      const currentUser = getCurrentUserFallback();
      try {
        const overview = await apiRequest<DashboardOverview>('/api/dashboard/overview');
        if (overview && overview.brother && overview.personalFinance) {
          return overview;
        }
      } catch {}
      return localDb.getDashboardOverview(currentUser);
    }
  },

  privateNotes: {
    getAll: async (): Promise<PrivateNote[]> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PrivateNote[]>('/api/private/notes');
        if (Array.isArray(res)) return res;
      } catch {}
      return localDb.getNotes(currentUser.id);
    },

    create: async (data: Partial<PrivateNote>): Promise<PrivateNote> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PrivateNote>('/api/private/notes', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.createNote(currentUser.id, res);
          return res;
        }
      } catch {}
      return localDb.createNote(currentUser.id, data);
    },

    update: async (id: string, data: Partial<PrivateNote>): Promise<PrivateNote> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PrivateNote>(`/api/private/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.updateNote(currentUser.id, id, res);
          return res;
        }
      } catch {}
      return localDb.updateNote(currentUser.id, id, data);
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      const currentUser = getCurrentUserFallback();
      try {
        await apiRequest<{ success: boolean }>(`/api/private/notes/${id}`, {
          method: 'DELETE'
        });
      } catch {}
      localDb.deleteNote(currentUser.id, id);
      return { success: true };
    }
  },

  privateMoney: {
    getAll: async (): Promise<PersonalTransaction[]> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PersonalTransaction[]>('/api/private/money');
        if (Array.isArray(res)) return res;
      } catch {}
      return localDb.getTransactions(currentUser.id);
    },

    getSummary: async () => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<{
          totalIncome: number;
          totalExpense: number;
          netBalance: number;
          currency: string;
          categoryBreakdown: any[];
        }>('/api/private/money/summary');
        if (res && typeof res.totalIncome === 'number') return res;
      } catch {}
      return localDb.getMoneySummary(currentUser.id);
    },

    create: async (data: Partial<PersonalTransaction>): Promise<PersonalTransaction> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PersonalTransaction>('/api/private/money', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.createTransaction(currentUser.id, res);
          return res;
        }
      } catch {}
      return localDb.createTransaction(currentUser.id, data);
    },

    update: async (id: string, data: Partial<PersonalTransaction>): Promise<PersonalTransaction> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PersonalTransaction>(`/api/private/money/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.updateTransaction(currentUser.id, id, res);
          return res;
        }
      } catch {}
      return localDb.updateTransaction(currentUser.id, id, data);
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      const currentUser = getCurrentUserFallback();
      try {
        await apiRequest<{ success: boolean }>(`/api/private/money/${id}`, {
          method: 'DELETE'
        });
      } catch {}
      localDb.deleteTransaction(currentUser.id, id);
      return { success: true };
    }
  },

  privateTasks: {
    getAll: async (): Promise<PrivateTask[]> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PrivateTask[]>('/api/private/tasks');
        if (Array.isArray(res)) return res;
      } catch {}
      return localDb.getTasks(currentUser.id);
    },

    create: async (data: Partial<PrivateTask>): Promise<PrivateTask> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PrivateTask>('/api/private/tasks', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.createTask(currentUser.id, res);
          return res;
        }
      } catch {}
      return localDb.createTask(currentUser.id, data);
    },

    update: async (id: string, data: Partial<PrivateTask>): Promise<PrivateTask> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PrivateTask>(`/api/private/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.updateTask(currentUser.id, id, res);
          return res;
        }
      } catch {}
      return localDb.updateTask(currentUser.id, id, data);
    },

    toggleStatus: async (id: string, status: 'pending' | 'completed'): Promise<PrivateTask> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<PrivateTask>(`/api/private/tasks/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
        if (res && res.id) {
          localDb.toggleTaskStatus(currentUser.id, id, status);
          return res;
        }
      } catch {}
      return localDb.toggleTaskStatus(currentUser.id, id, status);
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      const currentUser = getCurrentUserFallback();
      try {
        await apiRequest<{ success: boolean }>(`/api/private/tasks/${id}`, {
          method: 'DELETE'
        });
      } catch {}
      localDb.deleteTask(currentUser.id, id);
      return { success: true };
    }
  },

  sharedIncome: {
    getAll: async (): Promise<SharedIncome[]> => {
      try {
        const res = await apiRequest<SharedIncome[]>('/api/shared/income');
        if (Array.isArray(res)) return res;
      } catch {}
      return localDb.getSharedIncome();
    },

    getSummary: async () => {
      try {
        const res = await apiRequest<{
          total: number;
          count: number;
          currency: string;
          categories: any[];
        }>('/api/shared/income/summary');
        if (res && typeof res.total === 'number') return res;
      } catch {}
      return localDb.getSharedIncomeSummary();
    },

    create: async (data: Partial<SharedIncome>): Promise<SharedIncome> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<SharedIncome>('/api/shared/income', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.createSharedIncome(currentUser, res);
          return res;
        }
      } catch {}
      return localDb.createSharedIncome(currentUser, data);
    },

    update: async (id: string, data: Partial<SharedIncome>): Promise<SharedIncome> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<SharedIncome>(`/api/shared/income/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.updateSharedIncome(currentUser, id, res);
          return res;
        }
      } catch {}
      return localDb.updateSharedIncome(currentUser, id, data);
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      try {
        await apiRequest<{ success: boolean }>(`/api/shared/income/${id}`, {
          method: 'DELETE'
        });
      } catch {}
      localDb.deleteSharedIncome(id);
      return { success: true };
    }
  },

  sharedTasks: {
    getAll: async (): Promise<SharedTask[]> => {
      try {
        const res = await apiRequest<SharedTask[]>('/api/shared/tasks');
        if (Array.isArray(res)) return res;
      } catch {}
      return localDb.getSharedTasks();
    },

    create: async (data: Partial<SharedTask>): Promise<SharedTask> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<SharedTask>('/api/shared/tasks', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.createSharedTask(currentUser, res);
          return res;
        }
      } catch {}
      return localDb.createSharedTask(currentUser, data);
    },

    update: async (id: string, data: Partial<SharedTask>): Promise<SharedTask> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<SharedTask>(`/api/shared/tasks/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.updateSharedTask(currentUser, id, res);
          return res;
        }
      } catch {}
      return localDb.updateSharedTask(currentUser, id, data);
    },

    toggleStatus: async (id: string, status: 'pending' | 'completed'): Promise<SharedTask> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<SharedTask>(`/api/shared/tasks/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        });
        if (res && res.id) {
          localDb.toggleSharedTask(currentUser, id, status);
          return res;
        }
      } catch {}
      return localDb.toggleSharedTask(currentUser, id, status);
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      try {
        await apiRequest<{ success: boolean }>(`/api/shared/tasks/${id}`, {
          method: 'DELETE'
        });
      } catch {}
      localDb.deleteSharedTask(id);
      return { success: true };
    }
  },

  familyPlans: {
    getAll: async (): Promise<FamilyPlan[]> => {
      try {
        const res = await apiRequest<FamilyPlan[]>('/api/shared/plans');
        if (Array.isArray(res)) return res;
      } catch {}
      return localDb.getPlans();
    },

    create: async (data: Partial<FamilyPlan>): Promise<FamilyPlan> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<FamilyPlan>('/api/shared/plans', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.createPlan(currentUser, res);
          return res;
        }
      } catch {}
      return localDb.createPlan(currentUser, data);
    },

    update: async (id: string, data: Partial<FamilyPlan>): Promise<FamilyPlan> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<FamilyPlan>(`/api/shared/plans/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.updatePlan(currentUser, id, res);
          return res;
        }
      } catch {}
      return localDb.updatePlan(currentUser, id, data);
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      try {
        await apiRequest<{ success: boolean }>(`/api/shared/plans/${id}`, {
          method: 'DELETE'
        });
      } catch {}
      localDb.deletePlan(id);
      return { success: true };
    }
  },

  announcements: {
    getAll: async (): Promise<FamilyAnnouncement[]> => {
      try {
        const res = await apiRequest<FamilyAnnouncement[]>('/api/shared/announcements');
        if (Array.isArray(res)) return res;
      } catch {}
      return localDb.getAnnouncements();
    },

    create: async (data: Partial<FamilyAnnouncement>): Promise<FamilyAnnouncement> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<FamilyAnnouncement>('/api/shared/announcements', {
          method: 'POST',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.createAnnouncement(currentUser, res);
          return res;
        }
      } catch {}
      return localDb.createAnnouncement(currentUser, data);
    },

    update: async (id: string, data: Partial<FamilyAnnouncement>): Promise<FamilyAnnouncement> => {
      const currentUser = getCurrentUserFallback();
      try {
        const res = await apiRequest<FamilyAnnouncement>(`/api/shared/announcements/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        });
        if (res && res.id) {
          localDb.updateAnnouncement(currentUser, id, res);
          return res;
        }
      } catch {}
      return localDb.updateAnnouncement(currentUser, id, data);
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      try {
        await apiRequest<{ success: boolean }>(`/api/shared/announcements/${id}`, {
          method: 'DELETE'
        });
      } catch {}
      localDb.deleteAnnouncement(id);
      return { success: true };
    }
  },

  admin: {
    clearExamples: async () => {
      localDb.clearExamples();
      try {
        return await apiRequest<{ success: boolean; message: string }>('/api/admin/clear-examples', {
          method: 'POST'
        });
      } catch {
        return { success: true, message: 'Sample example records cleared from storage.' };
      }
    },

    restoreExamples: async () => {
      localDb.restoreExamples();
      try {
        return await apiRequest<{ success: boolean; message: string }>('/api/admin/restore-examples', {
          method: 'POST'
        });
      } catch {
        return { success: true, message: 'Sample example records restored successfully.' };
      }
    }
  }
};
