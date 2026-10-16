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
import { cloudDb } from './firestoreService.ts';

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

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}

function getCurrentUserFallback(): Brother {
  const current = tokenStorage.getUser();
  if (current) return current;
  const brothers = localDb.getBrothers();
  return brothers[0];
}

// Optional Express API forwarder (when running in Node server)
async function tryServerRequest<T>(url: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const token = tokenStorage.get() || tokenStorage.getUser()?.brother_key;
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { ...options, headers, signal: controller.signal });
    clearTimeout(timeoutId);

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || contentType.includes('text/html')) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export const api = {
  auth: {
    getFamilyMembers: async (): Promise<Brother[]> => {
      try {
        const cloudMembers = await cloudDb.getBrothers();
        if (Array.isArray(cloudMembers) && cloudMembers.length > 0) {
          // Sync with local cache
          for (const b of cloudMembers) {
            localDb.updateBrother(b.id, b);
          }
          const active = tokenStorage.getUser();
          if (active) {
            const match = cloudMembers.find((m) => m.id === active.id);
            if (match && (match.avatar_url !== active.avatar_url || match.full_name !== active.full_name)) {
              tokenStorage.setUser(match);
            }
          }
          return cloudMembers;
        }
      } catch (err) {
        console.warn('Cloud getFamilyMembers error:', err);
      }

      // Check SQLite server or local
      const serverRes = await tryServerRequest<Brother[]>('/api/family/members');
      if (serverRes && Array.isArray(serverRes) && serverRes.length > 0) {
        return serverRes;
      }
      return localDb.getBrothers();
    },

    login: async (emailOrKey: string, passcode: string): Promise<{ token: string; user: Brother }> => {
      const trimmed = emailOrKey.trim().toLowerCase();
      // First try to fetch real cloud members
      const brothers = await api.auth.getFamilyMembers();
      const brother = brothers.find(
        (b) =>
          b.brother_key.toLowerCase() === trimmed ||
          b.email.toLowerCase() === trimmed ||
          b.full_name.toLowerCase().includes(trimmed)
      );

      if (!brother) {
        throw new Error('Account not found. Please select one of the four brother accounts.');
      }

      // Try server login first if backend is running
      const serverLogin = await tryServerRequest<{ token: string; user: Brother }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ emailOrKey, password: passcode })
      });
      if (serverLogin && serverLogin.token && serverLogin.user) {
        // Merge with cloud avatar
        const cloudUser = { ...serverLogin.user, avatar_url: brother.avatar_url || serverLogin.user.avatar_url };
        tokenStorage.set(serverLogin.token);
        tokenStorage.setUser(cloudUser);
        return { token: serverLogin.token, user: cloudUser };
      }

      // Verify passcode via local storage
      if (localDb.verifyPassword(brother.brother_key, passcode)) {
        const fallback = {
          token: `session_${brother.brother_key}_${Date.now()}`,
          user: brother
        };
        tokenStorage.set(fallback.token);
        tokenStorage.setUser(fallback.user);
        return fallback;
      }

      throw new Error(`Incorrect passcode for ${brother.full_name}. (Default: ${brother.brother_key}2026)`);
    },

    getMe: async (): Promise<{ user: Brother }> => {
      const stored = tokenStorage.getUser() || getCurrentUserFallback();
      try {
        const members = await cloudDb.getBrothers();
        const fresh = members.find((m) => m.id === stored.id);
        if (fresh) {
          tokenStorage.setUser(fresh);
          return { user: fresh };
        }
      } catch {}
      return { user: stored };
    },

    logout: async () => {
      try {
        await tryServerRequest('/api/auth/logout', { method: 'POST' });
      } catch {}
      tokenStorage.remove();
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      const current = getCurrentUserFallback();
      if (!localDb.verifyPassword(current.brother_key, currentPassword)) {
        throw new Error('Current passcode is incorrect.');
      }
      localDb.setPassword(current.brother_key, newPassword);
      await tryServerRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      return { success: true, message: 'Passcode updated successfully.' };
    },

    updateProfile: async (data: { email?: string; avatar_url?: string | null; phone_number?: string; full_name?: string }) => {
      const current = getCurrentUserFallback();

      // 1. Save directly to Cloud Firestore (Live across all mobiles & computers)
      const cloudUpdated = await cloudDb.updateBrotherProfile(current.id, data);

      // 2. Also sync to localDb and active session
      localDb.updateBrother(current.id, cloudUpdated);
      tokenStorage.setUser(cloudUpdated);

      // 3. Inform backend server if available
      tryServerRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data)
      }).catch(() => {});

      return {
        success: true,
        message: 'Profile & picture permanently saved! Synchronized live across all devices.',
        user: cloudUpdated
      };
    }
  },

  dashboard: {
    getOverview: async (): Promise<DashboardOverview> => {
      const currentUser = tokenStorage.getUser() || getCurrentUserFallback();
      try {
        // Fetch real cloud counts
        const [cloudTxs, cloudTasks, cloudNotes, cloudSharedTasks, cloudPlans, cloudAnns, cloudSharedInc] =
          await Promise.allSettled([
            cloudDb.getPersonalTransactions(currentUser.id),
            cloudDb.getPrivateTasks(currentUser.id),
            cloudDb.getPrivateNotes(currentUser.id),
            cloudDb.getSharedTasks(),
            cloudDb.getFamilyPlans(),
            cloudDb.getFamilyAnnouncements(),
            cloudDb.getSharedIncome()
          ]);

        const txs = cloudTxs.status === 'fulfilled' && cloudTxs.value.length > 0
          ? cloudTxs.value
          : localDb.getTransactions(currentUser.id);

        let totalIncome = 0;
        let totalExpense = 0;
        for (const t of txs) {
          const amt = Number(t.amount) || 0;
          if (t.type === 'income') totalIncome += amt;
          else totalExpense += amt;
        }

        const myTasks = cloudTasks.status === 'fulfilled' && cloudTasks.value.length > 0
          ? cloudTasks.value.filter((t) => t.status === 'pending').slice(0, 4)
          : localDb.getTasks(currentUser.id).filter((t) => t.status === 'pending').slice(0, 4);

        const notesCount = cloudNotes.status === 'fulfilled' && cloudNotes.value.length > 0
          ? cloudNotes.value.length
          : localDb.getNotes(currentUser.id).length;

        const sharedIncList = cloudSharedInc.status === 'fulfilled' && cloudSharedInc.value.length > 0
          ? cloudSharedInc.value
          : localDb.getSharedIncome();
        const totalSharedIncome = sharedIncList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

        const sharedTasks = cloudSharedTasks.status === 'fulfilled' && cloudSharedTasks.value.length > 0
          ? cloudSharedTasks.value.filter((t) => t.status === 'pending').slice(0, 4)
          : localDb.getSharedTasks().filter((t) => t.status === 'pending').slice(0, 4);

        const plans = cloudPlans.status === 'fulfilled' && cloudPlans.value.length > 0
          ? cloudPlans.value.slice(0, 3)
          : localDb.getPlans().slice(0, 3);

        const anns = cloudAnns.status === 'fulfilled' && cloudAnns.value.length > 0
          ? cloudAnns.value.slice(0, 3)
          : localDb.getAnnouncements().slice(0, 3);

        return {
          brother: currentUser,
          personalFinance: {
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense,
            currency: 'PKR',
            recentTransactions: txs.slice(0, 5)
          },
          upcomingPrivateTasks: myTasks,
          privateNotesCount: notesCount,
          sharedFinance: {
            totalSharedIncome,
            currency: 'PKR'
          },
          upcomingSharedTasks: sharedTasks,
          upcomingPlans: plans,
          recentAnnouncements: anns
        };
      } catch (err) {
        console.warn('[Dashboard] fallback to localDb overview:', err);
        return localDb.getDashboardOverview(currentUser);
      }
    }
  },

  privateNotes: {
    getAll: async (): Promise<PrivateNote[]> => {
      const currentUser = getCurrentUserFallback();
      try {
        const cloudNotes = await cloudDb.getPrivateNotes(currentUser.id);
        if (cloudNotes.length > 0) return cloudNotes;
      } catch {}
      return localDb.getNotes(currentUser.id);
    },

    create: async (data: Partial<PrivateNote>): Promise<PrivateNote> => {
      const currentUser = getCurrentUserFallback();
      const now = new Date().toISOString();
      const newNote: PrivateNote = {
        id: generateId(),
        user_id: currentUser.id,
        title: data.title || 'Untitled Note',
        content: data.content || '',
        category: data.category || 'General',
        is_pinned: data.is_pinned ? 1 : 0,
        is_example: 0,
        created_at: now,
        updated_at: now
      };

      // 1. Cloud Firestore
      await cloudDb.savePrivateNote(currentUser.id, newNote).catch(() => {});
      // 2. Local fallback & server sync
      localDb.createNote(currentUser.id, newNote);
      tryServerRequest('/api/private/notes', { method: 'POST', body: JSON.stringify(newNote) }).catch(() => {});
      return newNote;
    },

    update: async (id: string, data: Partial<PrivateNote>): Promise<PrivateNote> => {
      const currentUser = getCurrentUserFallback();
      const updated = localDb.updateNote(currentUser.id, id, data);
      await cloudDb.savePrivateNote(currentUser.id, updated).catch(() => {});
      tryServerRequest(`/api/private/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => {});
      return updated;
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      const currentUser = getCurrentUserFallback();
      localDb.deleteNote(currentUser.id, id);
      await cloudDb.deletePrivateNote(currentUser.id, id).catch(() => {});
      tryServerRequest(`/api/private/notes/${id}`, { method: 'DELETE' }).catch(() => {});
      return { success: true };
    }
  },

  privateMoney: {
    getAll: async (): Promise<PersonalTransaction[]> => {
      const currentUser = getCurrentUserFallback();
      try {
        const cloudTxs = await cloudDb.getPersonalTransactions(currentUser.id);
        if (cloudTxs.length > 0) return cloudTxs;
      } catch {}
      return localDb.getTransactions(currentUser.id);
    },

    getSummary: async () => {
      const currentUser = getCurrentUserFallback();
      const txs = await api.privateMoney.getAll();
      let totalIncome = 0;
      let totalExpense = 0;
      const catMap: Record<string, { category: string; type: string; total: number; count: number }> = {};

      for (const t of txs) {
        const amt = Number(t.amount) || 0;
        if (t.type === 'income') totalIncome += amt;
        else totalExpense += amt;

        const key = `${t.type}_${t.category}`;
        if (!catMap[key]) catMap[key] = { category: t.category, type: t.type, total: 0, count: 0 };
        catMap[key].total += amt;
        catMap[key].count += 1;
      }

      return {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        currency: 'PKR',
        categoryBreakdown: Object.values(catMap)
      };
    },

    create: async (data: Partial<PersonalTransaction>): Promise<PersonalTransaction> => {
      const currentUser = getCurrentUserFallback();
      const now = new Date().toISOString();
      const newTx: PersonalTransaction = {
        id: generateId(),
        user_id: currentUser.id,
        type: data.type === 'expense' ? 'expense' : 'income',
        amount: Math.abs(Number(data.amount) || 0),
        currency: data.currency || 'PKR',
        description: data.description || 'Transaction',
        category: data.category || 'General',
        date: data.date || now.split('T')[0],
        is_example: 0,
        created_at: now,
        updated_at: now
      };

      await cloudDb.savePersonalTransaction(currentUser.id, newTx).catch(() => {});
      localDb.createTransaction(currentUser.id, newTx);
      tryServerRequest('/api/private/money', { method: 'POST', body: JSON.stringify(newTx) }).catch(() => {});
      return newTx;
    },

    update: async (id: string, data: Partial<PersonalTransaction>): Promise<PersonalTransaction> => {
      const currentUser = getCurrentUserFallback();
      const updated = localDb.updateTransaction(currentUser.id, id, data);
      await cloudDb.savePersonalTransaction(currentUser.id, updated).catch(() => {});
      tryServerRequest(`/api/private/money/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => {});
      return updated;
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      const currentUser = getCurrentUserFallback();
      localDb.deleteTransaction(currentUser.id, id);
      await cloudDb.deletePersonalTransaction(currentUser.id, id).catch(() => {});
      tryServerRequest(`/api/private/money/${id}`, { method: 'DELETE' }).catch(() => {});
      return { success: true };
    }
  },

  privateTasks: {
    getAll: async (): Promise<PrivateTask[]> => {
      const currentUser = getCurrentUserFallback();
      try {
        const cloudTasks = await cloudDb.getPrivateTasks(currentUser.id);
        if (cloudTasks.length > 0) return cloudTasks;
      } catch {}
      return localDb.getTasks(currentUser.id);
    },

    create: async (data: Partial<PrivateTask>): Promise<PrivateTask> => {
      const currentUser = getCurrentUserFallback();
      const now = new Date().toISOString();
      const newTask: PrivateTask = {
        id: generateId(),
        user_id: currentUser.id,
        title: data.title || 'Untitled Task',
        description: data.description || '',
        due_date: data.due_date || null,
        due_time: data.due_time || '12:00',
        priority: data.priority || 'medium',
        status: data.status || 'pending',
        category: data.category || 'Personal',
        is_example: 0,
        created_at: now,
        updated_at: now
      };

      await cloudDb.savePrivateTask(currentUser.id, newTask).catch(() => {});
      localDb.createTask(currentUser.id, newTask);
      tryServerRequest('/api/private/tasks', { method: 'POST', body: JSON.stringify(newTask) }).catch(() => {});
      return newTask;
    },

    update: async (id: string, data: Partial<PrivateTask>): Promise<PrivateTask> => {
      const currentUser = getCurrentUserFallback();
      const updated = localDb.updateTask(currentUser.id, id, data);
      await cloudDb.savePrivateTask(currentUser.id, updated).catch(() => {});
      tryServerRequest(`/api/private/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => {});
      return updated;
    },

    toggleStatus: async (id: string, status: 'pending' | 'completed'): Promise<PrivateTask> => {
      return api.privateTasks.update(id, { status });
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      const currentUser = getCurrentUserFallback();
      localDb.deleteTask(currentUser.id, id);
      await cloudDb.deletePrivateTask(currentUser.id, id).catch(() => {});
      tryServerRequest(`/api/private/tasks/${id}`, { method: 'DELETE' }).catch(() => {});
      return { success: true };
    }
  },

  sharedIncome: {
    getAll: async (): Promise<SharedIncome[]> => {
      try {
        const cloudInc = await cloudDb.getSharedIncome();
        if (cloudInc.length > 0) return cloudInc;
      } catch {}
      return localDb.getSharedIncome();
    },

    getSummary: async () => {
      const list = await api.sharedIncome.getAll();
      let total = 0;
      const catMap: Record<string, { category: string; total: number; count: number }> = {};
      for (const item of list) {
        const amt = Number(item.amount) || 0;
        total += amt;
        const cat = item.source_category || 'Other';
        if (!catMap[cat]) catMap[cat] = { category: cat, total: 0, count: 0 };
        catMap[cat].total += amt;
        catMap[cat].count += 1;
      }
      return {
        total,
        count: list.length,
        currency: 'PKR',
        categories: Object.values(catMap)
      };
    },

    create: async (data: Partial<SharedIncome>): Promise<SharedIncome> => {
      const currentUser = getCurrentUserFallback();
      const now = new Date().toISOString();
      const newInc: SharedIncome = {
        id: generateId(),
        title: data.title || 'Shared Income',
        amount: Math.abs(Number(data.amount) || 0),
        currency: data.currency || 'PKR',
        source_category: data.source_category || 'General',
        date: data.date || now.split('T')[0],
        notes: data.notes || '',
        created_by_id: currentUser.id,
        created_by_name: currentUser.full_name,
        updated_by_name: currentUser.full_name,
        is_example: 0,
        created_at: now,
        updated_at: now
      };

      await cloudDb.saveSharedIncome(newInc).catch(() => {});
      localDb.createSharedIncome(currentUser, newInc);
      tryServerRequest('/api/shared/income', { method: 'POST', body: JSON.stringify(newInc) }).catch(() => {});
      return newInc;
    },

    update: async (id: string, data: Partial<SharedIncome>): Promise<SharedIncome> => {
      const currentUser = getCurrentUserFallback();
      const updated = localDb.updateSharedIncome(currentUser, id, data);
      await cloudDb.saveSharedIncome(updated).catch(() => {});
      tryServerRequest(`/api/shared/income/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => {});
      return updated;
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      localDb.deleteSharedIncome(id);
      await cloudDb.deleteSharedIncome(id).catch(() => {});
      tryServerRequest(`/api/shared/income/${id}`, { method: 'DELETE' }).catch(() => {});
      return { success: true };
    }
  },

  sharedTasks: {
    getAll: async (): Promise<SharedTask[]> => {
      try {
        const cloudTasks = await cloudDb.getSharedTasks();
        if (cloudTasks.length > 0) return cloudTasks;
      } catch {}
      return localDb.getSharedTasks();
    },

    create: async (data: Partial<SharedTask>): Promise<SharedTask> => {
      const currentUser = getCurrentUserFallback();
      const now = new Date().toISOString();
      const newTask: SharedTask = {
        id: generateId(),
        title: data.title || 'Shared Task',
        description: data.description || '',
        due_date: data.due_date || null,
        due_time: data.due_time || '12:00',
        priority: data.priority || 'medium',
        assigned_to_name: data.assigned_to_name || 'All Brothers',
        assigned_to_id: data.assigned_to_id || null,
        assigned_to_phone: data.assigned_to_phone || null,
        assigned_to_avatar: data.assigned_to_avatar || null,
        status: data.status || 'pending',
        created_by_id: currentUser.id,
        created_by_name: currentUser.full_name,
        updated_by_name: currentUser.full_name,
        is_example: 0,
        created_at: now,
        updated_at: now
      };

      await cloudDb.saveSharedTask(newTask).catch(() => {});
      localDb.createSharedTask(currentUser, newTask);
      tryServerRequest('/api/shared/tasks', { method: 'POST', body: JSON.stringify(newTask) }).catch(() => {});
      return newTask;
    },

    update: async (id: string, data: Partial<SharedTask>): Promise<SharedTask> => {
      const currentUser = getCurrentUserFallback();
      const updated = localDb.updateSharedTask(currentUser, id, data);
      await cloudDb.saveSharedTask(updated).catch(() => {});
      tryServerRequest(`/api/shared/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => {});
      return updated;
    },

    toggleStatus: async (id: string, status: 'pending' | 'completed'): Promise<SharedTask> => {
      const currentUser = getCurrentUserFallback();
      return api.sharedTasks.update(id, { status });
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      localDb.deleteSharedTask(id);
      await cloudDb.deleteSharedTask(id).catch(() => {});
      tryServerRequest(`/api/shared/tasks/${id}`, { method: 'DELETE' }).catch(() => {});
      return { success: true };
    }
  },

  familyPlans: {
    getAll: async (): Promise<FamilyPlan[]> => {
      try {
        const plans = await cloudDb.getFamilyPlans();
        if (plans.length > 0) return plans;
      } catch {}
      return localDb.getPlans();
    },

    create: async (data: Partial<FamilyPlan>): Promise<FamilyPlan> => {
      const currentUser = getCurrentUserFallback();
      const now = new Date().toISOString();
      const newPlan: FamilyPlan = {
        id: generateId(),
        title: data.title || 'Family Plan',
        description: data.description || '',
        date: data.date || now.split('T')[0],
        time: data.time || '18:00',
        location: data.location || 'Peshawar',
        created_by_id: currentUser.id,
        created_by_name: currentUser.full_name,
        updated_by_name: currentUser.full_name,
        is_example: 0,
        created_at: now,
        updated_at: now
      };

      await cloudDb.saveFamilyPlan(newPlan).catch(() => {});
      localDb.createPlan(currentUser, newPlan);
      tryServerRequest('/api/shared/plans', { method: 'POST', body: JSON.stringify(newPlan) }).catch(() => {});
      return newPlan;
    },

    update: async (id: string, data: Partial<FamilyPlan>): Promise<FamilyPlan> => {
      const currentUser = getCurrentUserFallback();
      const updated = localDb.updatePlan(currentUser, id, data);
      await cloudDb.saveFamilyPlan(updated).catch(() => {});
      tryServerRequest(`/api/shared/plans/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => {});
      return updated;
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      localDb.deletePlan(id);
      await cloudDb.deleteFamilyPlan(id).catch(() => {});
      tryServerRequest(`/api/shared/plans/${id}`, { method: 'DELETE' }).catch(() => {});
      return { success: true };
    }
  },

  announcements: {
    getAll: async (): Promise<FamilyAnnouncement[]> => {
      try {
        const anns = await cloudDb.getFamilyAnnouncements();
        if (anns.length > 0) return anns;
      } catch {}
      return localDb.getAnnouncements();
    },

    create: async (data: Partial<FamilyAnnouncement>): Promise<FamilyAnnouncement> => {
      const currentUser = getCurrentUserFallback();
      const now = new Date().toISOString();
      const newAnn: FamilyAnnouncement = {
        id: generateId(),
        title: data.title || 'Announcement',
        content: data.content || '',
        tag: data.tag || 'Family Update',
        is_pinned: data.is_pinned ? 1 : 0,
        created_by_id: currentUser.id,
        created_by_name: currentUser.full_name,
        updated_by_name: currentUser.full_name,
        is_example: 0,
        created_at: now,
        updated_at: now
      };

      await cloudDb.saveFamilyAnnouncement(newAnn).catch(() => {});
      localDb.createAnnouncement(currentUser, newAnn);
      tryServerRequest('/api/shared/announcements', { method: 'POST', body: JSON.stringify(newAnn) }).catch(() => {});
      return newAnn;
    },

    update: async (id: string, data: Partial<FamilyAnnouncement>): Promise<FamilyAnnouncement> => {
      const currentUser = getCurrentUserFallback();
      const updated = localDb.updateAnnouncement(currentUser, id, data);
      await cloudDb.saveFamilyAnnouncement(updated).catch(() => {});
      tryServerRequest(`/api/shared/announcements/${id}`, { method: 'PUT', body: JSON.stringify(data) }).catch(() => {});
      return updated;
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      localDb.deleteAnnouncement(id);
      await cloudDb.deleteFamilyAnnouncement(id).catch(() => {});
      tryServerRequest(`/api/shared/announcements/${id}`, { method: 'DELETE' }).catch(() => {});
      return { success: true };
    }
  },

  admin: {
    clearExamples: async () => {
      localDb.clearExamples();
      tryServerRequest('/api/admin/clear-examples', { method: 'POST' }).catch(() => {});
      return { success: true, message: 'Sample example records cleared from storage.' };
    },

    restoreExamples: async () => {
      localDb.restoreExamples();
      tryServerRequest('/api/admin/restore-examples', { method: 'POST' }).catch(() => {});
      return { success: true, message: 'Sample example records restored successfully.' };
    }
  }
};
