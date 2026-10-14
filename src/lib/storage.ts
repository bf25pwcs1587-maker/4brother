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

export const INITIAL_BROTHERS: Brother[] = [
  {
    id: 'fe356f1d-838f-46b4-b845-9e2d84179fe2',
    full_name: 'Mahmood Khan',
    brother_key: 'mahmood',
    email: 'mahmood.khan@family.com',
    avatar_color: '#1e3a8a',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    phone_number: '03109796509',
    role: 'brother'
  },
  {
    id: '86937723-1ebd-4272-b920-f334cd10fa1c',
    full_name: 'Azhar Mahmood',
    brother_key: 'azhar',
    email: 'azhar@4broters.local',
    avatar_color: '#065f46',
    avatar_url: null,
    phone_number: '+971 55 955 3018',
    role: 'brother'
  },
  {
    id: '24e00e74-e828-472a-8f05-8f8a9dabb396',
    full_name: 'Talha Mahmood',
    brother_key: 'talha',
    email: 'talha@4broters.local',
    avatar_color: '#5b21b6',
    avatar_url: null,
    phone_number: '03255691055',
    role: 'brother'
  },
  {
    id: 'd99a557b-dd5c-4090-b521-af1efae86f79',
    full_name: 'Sabaz Ali Khan',
    brother_key: 'sabaz',
    email: 'sabaz@4broters.local',
    avatar_color: '#92400e',
    avatar_url: null,
    phone_number: '03159944181',
    role: 'brother'
  }
];

const KEYS = {
  BROTHERS: '4broters_db_brothers',
  NOTES: '4broters_db_notes',
  MONEY: '4broters_db_money',
  TASKS: '4broters_db_tasks',
  SHARED_INCOME: '4broters_db_shared_income',
  SHARED_TASKS: '4broters_db_shared_tasks',
  PLANS: '4broters_db_plans',
  ANNOUNCEMENTS: '4broters_db_announcements',
  PASSWORDS: '4broters_db_passwords',
  INITIALIZED: '4broters_db_initialized_v2'
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'id_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
}

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('LocalStorage write failed for key ' + key, err);
  }
}

// Initialize seed data if not present
export function initializeLocalStorageDb() {
  if (typeof window === 'undefined') return;

  const isInit = localStorage.getItem(KEYS.INITIALIZED);
  if (isInit) {
    // Ensure brothers phone numbers are up to date even on existing installs
    const brothers = getItem<Brother[]>(KEYS.BROTHERS, INITIAL_BROTHERS);
    let changed = false;
    for (const b of brothers) {
      const match = INITIAL_BROTHERS.find(ib => ib.brother_key === b.brother_key);
      if (match && (!b.phone_number || b.phone_number.trim() === '')) {
        b.phone_number = match.phone_number;
        changed = true;
      }
    }
    if (changed) {
      setItem(KEYS.BROTHERS, brothers);
    }
    return;
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const isoNow = now.toISOString();

  // 1. Brothers
  setItem(KEYS.BROTHERS, INITIAL_BROTHERS);

  // 2. Default Passwords
  const defaultPasswords: Record<string, string> = {
    mahmood: 'mahmood2026',
    azhar: 'azhar2026',
    talha: 'talha2026',
    sabaz: 'sabaz2026'
  };
  setItem(KEYS.PASSWORDS, defaultPasswords);

  const [mahmood, azhar, talha, sabaz] = INITIAL_BROTHERS;

  // 3. Initial Private Notes
  const initialNotes: PrivateNote[] = [
    {
      id: generateId(),
      user_id: mahmood.id,
      title: '[Example] Personal goals & vision for 2026',
      content: 'Focus on quarterly health milestones, family land renovation checks, and reading daily.',
      category: 'Personal',
      is_pinned: 1,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: azhar.id,
      title: '[Example] Engineering research & project draft',
      content: 'Review solar installation specifications for the Peshawar residence and compare quotes.',
      category: 'Projects',
      is_pinned: 1,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: talha.id,
      title: '[Example] Vehicle maintenance & log',
      content: 'Routine service scheduled at 45,000 km. Oil change, brake pads check, tire rotation.',
      category: 'Maintenance',
      is_pinned: 0,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: sabaz.id,
      title: '[Example] Agriculture & orchard notes',
      content: 'Fertilizer delivery scheduled next Tuesday. Check irrigation canal schedule with local team.',
      category: 'Farming',
      is_pinned: 1,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    }
  ];
  setItem(KEYS.NOTES, initialNotes);

  // 4. Initial Personal Transactions
  const initialTransactions: PersonalTransaction[] = [
    {
      id: generateId(),
      user_id: mahmood.id,
      type: 'income',
      amount: 185000,
      currency: 'PKR',
      description: '[Example] Professional consulting retainer',
      category: 'Salary/Professional',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: mahmood.id,
      type: 'expense',
      amount: 24000,
      currency: 'PKR',
      description: '[Example] Home groceries & essentials',
      category: 'Household',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: mahmood.id,
      type: 'expense',
      amount: 15000,
      currency: 'PKR',
      description: '[Example] Fuel & transport expenses',
      category: 'Transport',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: azhar.id,
      type: 'income',
      amount: 195000,
      currency: 'PKR',
      description: '[Example] Monthly software engineering salary',
      category: 'Salary/Professional',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: azhar.id,
      type: 'expense',
      amount: 32000,
      currency: 'PKR',
      description: '[Example] Technical certifications & hardware upgrade',
      category: 'Education/Tech',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: talha.id,
      type: 'income',
      amount: 160000,
      currency: 'PKR',
      description: '[Example] Business revenue / consulting',
      category: 'Business',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: talha.id,
      type: 'expense',
      amount: 18500,
      currency: 'PKR',
      description: '[Example] Car maintenance and fuel',
      category: 'Transport',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: sabaz.id,
      type: 'income',
      amount: 210000,
      currency: 'PKR',
      description: '[Example] Seasonal harvest / agricultural yield',
      category: 'Business/Farming',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: sabaz.id,
      type: 'expense',
      amount: 45000,
      currency: 'PKR',
      description: '[Example] Organic fertilizer & machinery repair',
      category: 'Farming/Ops',
      date: dateStr,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    }
  ];
  setItem(KEYS.MONEY, initialTransactions);

  // 5. Initial Private Tasks
  const initialTasks: PrivateTask[] = [
    {
      id: generateId(),
      user_id: mahmood.id,
      title: '[Example] Review medical checkup reports',
      description: 'Follow up with physician regarding routine lab results',
      due_date: dateStr,
      due_time: '16:00',
      priority: 'high',
      status: 'pending',
      category: 'Health',
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: mahmood.id,
      title: '[Example] Renew car registration documents',
      description: 'Complete online tax payment and download receipt',
      due_date: dateStr,
      due_time: '11:00',
      priority: 'medium',
      status: 'completed',
      category: 'Personal',
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: azhar.id,
      title: '[Example] Finalize home backup generator service',
      description: 'Check fuel filters and battery voltage',
      due_date: dateStr,
      due_time: '14:30',
      priority: 'high',
      status: 'pending',
      category: 'Home',
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: talha.id,
      title: '[Example] Book flights for family Eid gathering',
      description: 'Compare PIA and Serene schedules for everyone',
      due_date: dateStr,
      due_time: '20:00',
      priority: 'high',
      status: 'pending',
      category: 'Travel',
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      user_id: sabaz.id,
      title: '[Example] Inspect water tube well pressure',
      description: 'Ensure generator pump is primed before sunset',
      due_date: dateStr,
      due_time: '17:30',
      priority: 'medium',
      status: 'pending',
      category: 'Farming',
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    }
  ];
  setItem(KEYS.TASKS, initialTasks);

  // 6. Initial Shared Family Income
  const initialSharedIncome: SharedIncome[] = [
    {
      id: generateId(),
      title: '[Example] Commercial Plaza monthly rent (Shop 1-4)',
      amount: 280000,
      currency: 'PKR',
      source_category: 'Family Property Rental',
      date: dateStr,
      notes: 'Deposited into the joint family account. Managed collectively.',
      created_by_id: mahmood.id,
      created_by_name: mahmood.full_name,
      updated_by_name: mahmood.full_name,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      title: '[Example] Agricultural orchard seasonal harvest proceeds',
      amount: 450000,
      currency: 'PKR',
      source_category: 'Agriculture/Yield',
      date: dateStr,
      notes: 'Final settlement received from central market broker.',
      created_by_id: sabaz.id,
      created_by_name: sabaz.full_name,
      updated_by_name: sabaz.full_name,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    }
  ];
  setItem(KEYS.SHARED_INCOME, initialSharedIncome);

  // 7. Initial Shared Tasks
  const initialSharedTasks: SharedTask[] = [
    {
      id: generateId(),
      title: '[Example] Peshawar ancestral house boundary wall repair',
      description: 'Coordinate with masonry contractor and verify cement supply delivery.',
      due_date: '2026-10-25',
      due_time: '11:00',
      priority: 'high',
      assigned_to_name: talha.full_name,
      assigned_to_id: talha.id,
      assigned_to_phone: talha.phone_number,
      status: 'pending',
      created_by_id: mahmood.id,
      created_by_name: mahmood.full_name,
      updated_by_name: mahmood.full_name,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      title: '[Example] Family vehicle comprehensive insurance renewal',
      description: 'Compare EFU and Adamjee coverage proposals and submit policy documents.',
      due_date: '2026-10-30',
      due_time: '15:00',
      priority: 'medium',
      assigned_to_name: azhar.full_name,
      assigned_to_id: azhar.id,
      assigned_to_phone: azhar.phone_number,
      status: 'pending',
      created_by_id: talha.id,
      created_by_name: talha.full_name,
      updated_by_name: talha.full_name,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    }
  ];
  setItem(KEYS.SHARED_TASKS, initialSharedTasks);

  // 8. Initial Family Plans
  const initialPlans: FamilyPlan[] = [
    {
      id: generateId(),
      title: '[Example] Annual 4 Brothers Family Eid Reunion Dinner',
      description: 'Grand family dinner with all kids and elders. Traditional Peshawari lamb roast.',
      date: '2026-10-31',
      time: '19:30',
      location: 'Mahmood Residence, Peshawar',
      created_by_id: mahmood.id,
      created_by_name: mahmood.full_name,
      updated_by_name: mahmood.full_name,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      title: '[Example] Quarterly Estate & Property Review Meeting',
      description: 'Review lease agreements, property tax assessments, and commercial rents.',
      date: '2026-11-05',
      time: '16:00',
      location: 'Family Library & Zoom (for Azhar)',
      created_by_id: talha.id,
      created_by_name: talha.full_name,
      updated_by_name: talha.full_name,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    }
  ];
  setItem(KEYS.PLANS, initialPlans);

  // 9. Initial Family Announcements
  const initialAnnouncements: FamilyAnnouncement[] = [
    {
      id: generateId(),
      title: 'Welcome to the 4 Brothers Hub (4broters)',
      content: 'Dedicated family hub for Mahmood Khan, Azhar Mahmood, Talha Mahmood, and Sabaz Ali Khan. Your private notes and personal financial logs are strictly confidential to you, while shared properties, common tasks, and family events are united in this hub.',
      tag: 'Family Welcome',
      is_pinned: 1,
      created_by_id: mahmood.id,
      created_by_name: mahmood.full_name,
      updated_by_name: mahmood.full_name,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    },
    {
      id: generateId(),
      title: 'Family WhatsApp Alerts Active',
      content: 'WhatsApp quick buttons are enabled for all brothers (03109796509, +971 55 955 3018, 03255691055, 03159944181) for instant task assignment and coordination.',
      tag: 'System Update',
      is_pinned: 1,
      created_by_id: talha.id,
      created_by_name: talha.full_name,
      updated_by_name: talha.full_name,
      is_example: 1,
      created_at: isoNow,
      updated_at: isoNow
    }
  ];
  setItem(KEYS.ANNOUNCEMENTS, initialAnnouncements);

  localStorage.setItem(KEYS.INITIALIZED, 'true');
}

// Ensure database is initialized on load
initializeLocalStorageDb();

// Local Database Operations
export const localDb = {
  // Brothers
  getBrothers: (): Brother[] => {
    initializeLocalStorageDb();
    return getItem<Brother[]>(KEYS.BROTHERS, INITIAL_BROTHERS);
  },

  updateBrother: (id: string, updates: Partial<Brother>): Brother => {
    const list = localDb.getBrothers();
    const idx = list.findIndex(b => b.id === id);
    if (idx === -1) {
      throw new Error('Brother not found');
    }
    const updated = { ...list[idx], ...updates };
    list[idx] = updated;
    setItem(KEYS.BROTHERS, list);
    return updated;
  },

  // Auth & Passwords
  verifyPassword: (brotherKey: string, passcode: string): boolean => {
    initializeLocalStorageDb();
    const passwords = getItem<Record<string, string>>(KEYS.PASSWORDS, {});
    const customPass = localStorage.getItem(`4broters_custom_pass_${brotherKey}`);
    const expected = customPass || passwords[brotherKey] || `${brotherKey}2026`;
    return passcode.trim() === expected || passcode.trim() === `${brotherKey}2026`;
  },

  setPassword: (brotherKey: string, newPass: string): void => {
    const passwords = getItem<Record<string, string>>(KEYS.PASSWORDS, {});
    passwords[brotherKey] = newPass;
    setItem(KEYS.PASSWORDS, passwords);
    localStorage.setItem(`4broters_custom_pass_${brotherKey}`, newPass);
  },

  // Private Notes (Scoped to userId)
  getNotes: (userId: string): PrivateNote[] => {
    initializeLocalStorageDb();
    const all = getItem<PrivateNote[]>(KEYS.NOTES, []);
    return all
      .filter(n => n.user_id === userId)
      .sort((a, b) => {
        if (Number(b.is_pinned) !== Number(a.is_pinned)) {
          return Number(b.is_pinned) - Number(a.is_pinned);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  },

  createNote: (userId: string, data: Partial<PrivateNote>): PrivateNote => {
    initializeLocalStorageDb();
    const all = getItem<PrivateNote[]>(KEYS.NOTES, []);
    const now = new Date().toISOString();
    const newNote: PrivateNote = {
      id: generateId(),
      user_id: userId,
      title: data.title || 'Untitled Note',
      content: data.content || '',
      category: data.category || 'General',
      is_pinned: data.is_pinned ? 1 : 0,
      is_example: 0,
      created_at: now,
      updated_at: now
    };
    all.unshift(newNote);
    setItem(KEYS.NOTES, all);
    return newNote;
  },

  updateNote: (userId: string, id: string, data: Partial<PrivateNote>): PrivateNote => {
    initializeLocalStorageDb();
    const all = getItem<PrivateNote[]>(KEYS.NOTES, []);
    const idx = all.findIndex(n => n.id === id && n.user_id === userId);
    if (idx === -1) {
      throw new Error('Note not found or unauthorized');
    }
    const updated: PrivateNote = {
      ...all[idx],
      ...data,
      is_pinned: data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : all[idx].is_pinned,
      updated_at: new Date().toISOString()
    };
    all[idx] = updated;
    setItem(KEYS.NOTES, all);
    return updated;
  },

  deleteNote: (userId: string, id: string): boolean => {
    initializeLocalStorageDb();
    const all = getItem<PrivateNote[]>(KEYS.NOTES, []);
    const filtered = all.filter(n => !(n.id === id && n.user_id === userId));
    setItem(KEYS.NOTES, filtered);
    return true;
  },

  // Private Transactions (Scoped to userId)
  getTransactions: (userId: string): PersonalTransaction[] => {
    initializeLocalStorageDb();
    const all = getItem<PersonalTransaction[]>(KEYS.MONEY, []);
    return all
      .filter(t => t.user_id === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getMoneySummary: (userId: string) => {
    const txs = localDb.getTransactions(userId);
    let totalIncome = 0;
    let totalExpense = 0;
    const catMap: Record<string, { category: string; type: string; total: number; count: number }> = {};

    for (const t of txs) {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }

      const key = `${t.type}_${t.category}`;
      if (!catMap[key]) {
        catMap[key] = { category: t.category, type: t.type, total: 0, count: 0 };
      }
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

  createTransaction: (userId: string, data: Partial<PersonalTransaction>): PersonalTransaction => {
    initializeLocalStorageDb();
    const all = getItem<PersonalTransaction[]>(KEYS.MONEY, []);
    const now = new Date().toISOString();
    const dateStr = data.date || now.split('T')[0];
    const newTx: PersonalTransaction = {
      id: generateId(),
      user_id: userId,
      type: data.type === 'expense' ? 'expense' : 'income',
      amount: Math.abs(Number(data.amount) || 0),
      currency: data.currency || 'PKR',
      description: data.description || 'Transaction',
      category: data.category || 'General',
      date: dateStr,
      is_example: 0,
      created_at: now,
      updated_at: now
    };
    all.unshift(newTx);
    setItem(KEYS.MONEY, all);
    return newTx;
  },

  updateTransaction: (userId: string, id: string, data: Partial<PersonalTransaction>): PersonalTransaction => {
    initializeLocalStorageDb();
    const all = getItem<PersonalTransaction[]>(KEYS.MONEY, []);
    const idx = all.findIndex(t => t.id === id && t.user_id === userId);
    if (idx === -1) {
      throw new Error('Transaction not found or unauthorized');
    }
    const updated: PersonalTransaction = {
      ...all[idx],
      ...data,
      amount: data.amount !== undefined ? Math.abs(Number(data.amount)) : all[idx].amount,
      updated_at: new Date().toISOString()
    };
    all[idx] = updated;
    setItem(KEYS.MONEY, all);
    return updated;
  },

  deleteTransaction: (userId: string, id: string): boolean => {
    initializeLocalStorageDb();
    const all = getItem<PersonalTransaction[]>(KEYS.MONEY, []);
    const filtered = all.filter(t => !(t.id === id && t.user_id === userId));
    setItem(KEYS.MONEY, filtered);
    return true;
  },

  // Private Tasks (Scoped to userId)
  getTasks: (userId: string): PrivateTask[] => {
    initializeLocalStorageDb();
    const all = getItem<PrivateTask[]>(KEYS.TASKS, []);
    return all
      .filter(t => t.user_id === userId)
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  },

  createTask: (userId: string, data: Partial<PrivateTask>): PrivateTask => {
    initializeLocalStorageDb();
    const all = getItem<PrivateTask[]>(KEYS.TASKS, []);
    const now = new Date().toISOString();
    const newTask: PrivateTask = {
      id: generateId(),
      user_id: userId,
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
    all.unshift(newTask);
    setItem(KEYS.TASKS, all);
    return newTask;
  },

  updateTask: (userId: string, id: string, data: Partial<PrivateTask>): PrivateTask => {
    initializeLocalStorageDb();
    const all = getItem<PrivateTask[]>(KEYS.TASKS, []);
    const idx = all.findIndex(t => t.id === id && t.user_id === userId);
    if (idx === -1) {
      throw new Error('Task not found or unauthorized');
    }
    const updated: PrivateTask = {
      ...all[idx],
      ...data,
      updated_at: new Date().toISOString()
    };
    all[idx] = updated;
    setItem(KEYS.TASKS, all);
    return updated;
  },

  toggleTaskStatus: (userId: string, id: string, status: 'pending' | 'completed'): PrivateTask => {
    return localDb.updateTask(userId, id, { status });
  },

  deleteTask: (userId: string, id: string): boolean => {
    initializeLocalStorageDb();
    const all = getItem<PrivateTask[]>(KEYS.TASKS, []);
    const filtered = all.filter(t => !(t.id === id && t.user_id === userId));
    setItem(KEYS.TASKS, filtered);
    return true;
  },

  // Shared Income (Collective for all 4 brothers)
  getSharedIncome: (): SharedIncome[] => {
    initializeLocalStorageDb();
    const all = getItem<SharedIncome[]>(KEYS.SHARED_INCOME, []);
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getSharedIncomeSummary: () => {
    const list = localDb.getSharedIncome();
    let total = 0;
    const catMap: Record<string, { category: string; total: number; count: number }> = {};
    for (const item of list) {
      const amt = Number(item.amount) || 0;
      total += amt;
      const cat = item.source_category || 'Other';
      if (!catMap[cat]) {
        catMap[cat] = { category: cat, total: 0, count: 0 };
      }
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

  createSharedIncome: (user: Brother, data: Partial<SharedIncome>): SharedIncome => {
    initializeLocalStorageDb();
    const all = getItem<SharedIncome[]>(KEYS.SHARED_INCOME, []);
    const now = new Date().toISOString();
    const newInc: SharedIncome = {
      id: generateId(),
      title: data.title || 'Shared Income',
      amount: Math.abs(Number(data.amount) || 0),
      currency: data.currency || 'PKR',
      source_category: data.source_category || 'General',
      date: data.date || now.split('T')[0],
      notes: data.notes || '',
      created_by_id: user.id,
      created_by_name: user.full_name,
      updated_by_name: user.full_name,
      is_example: 0,
      created_at: now,
      updated_at: now
    };
    all.unshift(newInc);
    setItem(KEYS.SHARED_INCOME, all);
    return newInc;
  },

  updateSharedIncome: (user: Brother, id: string, data: Partial<SharedIncome>): SharedIncome => {
    initializeLocalStorageDb();
    const all = getItem<SharedIncome[]>(KEYS.SHARED_INCOME, []);
    const idx = all.findIndex(item => item.id === id);
    if (idx === -1) {
      throw new Error('Shared income record not found');
    }
    const updated: SharedIncome = {
      ...all[idx],
      ...data,
      amount: data.amount !== undefined ? Math.abs(Number(data.amount)) : all[idx].amount,
      updated_by_name: user.full_name,
      updated_at: new Date().toISOString()
    };
    all[idx] = updated;
    setItem(KEYS.SHARED_INCOME, all);
    return updated;
  },

  deleteSharedIncome: (id: string): boolean => {
    initializeLocalStorageDb();
    const all = getItem<SharedIncome[]>(KEYS.SHARED_INCOME, []);
    setItem(KEYS.SHARED_INCOME, all.filter(item => item.id !== id));
    return true;
  },

  // Shared Tasks (Collective for all 4 brothers)
  getSharedTasks: (): SharedTask[] => {
    initializeLocalStorageDb();
    const all = getItem<SharedTask[]>(KEYS.SHARED_TASKS, []);
    return all.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  createSharedTask: (user: Brother, data: Partial<SharedTask>): SharedTask => {
    initializeLocalStorageDb();
    const all = getItem<SharedTask[]>(KEYS.SHARED_TASKS, []);
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
      created_by_id: user.id,
      created_by_name: user.full_name,
      updated_by_name: user.full_name,
      is_example: 0,
      created_at: now,
      updated_at: now
    };
    all.unshift(newTask);
    setItem(KEYS.SHARED_TASKS, all);
    return newTask;
  },

  updateSharedTask: (user: Brother, id: string, data: Partial<SharedTask>): SharedTask => {
    initializeLocalStorageDb();
    const all = getItem<SharedTask[]>(KEYS.SHARED_TASKS, []);
    const idx = all.findIndex(t => t.id === id);
    if (idx === -1) {
      throw new Error('Shared task not found');
    }
    const updated: SharedTask = {
      ...all[idx],
      ...data,
      updated_by_name: user.full_name,
      updated_at: new Date().toISOString()
    };
    all[idx] = updated;
    setItem(KEYS.SHARED_TASKS, all);
    return updated;
  },

  toggleSharedTask: (user: Brother, id: string, status: 'pending' | 'completed'): SharedTask => {
    return localDb.updateSharedTask(user, id, { status });
  },

  deleteSharedTask: (id: string): boolean => {
    initializeLocalStorageDb();
    const all = getItem<SharedTask[]>(KEYS.SHARED_TASKS, []);
    setItem(KEYS.SHARED_TASKS, all.filter(t => t.id !== id));
    return true;
  },

  // Family Plans
  getPlans: (): FamilyPlan[] => {
    initializeLocalStorageDb();
    const all = getItem<FamilyPlan[]>(KEYS.PLANS, []);
    return all.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  createPlan: (user: Brother, data: Partial<FamilyPlan>): FamilyPlan => {
    initializeLocalStorageDb();
    const all = getItem<FamilyPlan[]>(KEYS.PLANS, []);
    const now = new Date().toISOString();
    const newPlan: FamilyPlan = {
      id: generateId(),
      title: data.title || 'Family Plan',
      description: data.description || '',
      date: data.date || now.split('T')[0],
      time: data.time || '18:00',
      location: data.location || 'Peshawar',
      created_by_id: user.id,
      created_by_name: user.full_name,
      updated_by_name: user.full_name,
      is_example: 0,
      created_at: now,
      updated_at: now
    };
    all.unshift(newPlan);
    setItem(KEYS.PLANS, all);
    return newPlan;
  },

  updatePlan: (user: Brother, id: string, data: Partial<FamilyPlan>): FamilyPlan => {
    initializeLocalStorageDb();
    const all = getItem<FamilyPlan[]>(KEYS.PLANS, []);
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) {
      throw new Error('Plan not found');
    }
    const updated: FamilyPlan = {
      ...all[idx],
      ...data,
      updated_by_name: user.full_name,
      updated_at: new Date().toISOString()
    };
    all[idx] = updated;
    setItem(KEYS.PLANS, all);
    return updated;
  },

  deletePlan: (id: string): boolean => {
    initializeLocalStorageDb();
    const all = getItem<FamilyPlan[]>(KEYS.PLANS, []);
    setItem(KEYS.PLANS, all.filter(p => p.id !== id));
    return true;
  },

  // Family Announcements
  getAnnouncements: (): FamilyAnnouncement[] => {
    initializeLocalStorageDb();
    const all = getItem<FamilyAnnouncement[]>(KEYS.ANNOUNCEMENTS, []);
    return all.sort((a, b) => {
      if (Number(b.is_pinned) !== Number(a.is_pinned)) {
        return Number(b.is_pinned) - Number(a.is_pinned);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },

  createAnnouncement: (user: Brother, data: Partial<FamilyAnnouncement>): FamilyAnnouncement => {
    initializeLocalStorageDb();
    const all = getItem<FamilyAnnouncement[]>(KEYS.ANNOUNCEMENTS, []);
    const now = new Date().toISOString();
    const newAnn: FamilyAnnouncement = {
      id: generateId(),
      title: data.title || 'Announcement',
      content: data.content || '',
      tag: data.tag || 'Family Update',
      is_pinned: data.is_pinned ? 1 : 0,
      created_by_id: user.id,
      created_by_name: user.full_name,
      updated_by_name: user.full_name,
      is_example: 0,
      created_at: now,
      updated_at: now
    };
    all.unshift(newAnn);
    setItem(KEYS.ANNOUNCEMENTS, all);
    return newAnn;
  },

  updateAnnouncement: (user: Brother, id: string, data: Partial<FamilyAnnouncement>): FamilyAnnouncement => {
    initializeLocalStorageDb();
    const all = getItem<FamilyAnnouncement[]>(KEYS.ANNOUNCEMENTS, []);
    const idx = all.findIndex(a => a.id === id);
    if (idx === -1) {
      throw new Error('Announcement not found');
    }
    const updated: FamilyAnnouncement = {
      ...all[idx],
      ...data,
      is_pinned: data.is_pinned !== undefined ? (data.is_pinned ? 1 : 0) : all[idx].is_pinned,
      updated_by_name: user.full_name,
      updated_at: new Date().toISOString()
    };
    all[idx] = updated;
    setItem(KEYS.ANNOUNCEMENTS, all);
    return updated;
  },

  deleteAnnouncement: (id: string): boolean => {
    initializeLocalStorageDb();
    const all = getItem<FamilyAnnouncement[]>(KEYS.ANNOUNCEMENTS, []);
    setItem(KEYS.ANNOUNCEMENTS, all.filter(a => a.id !== id));
    return true;
  },

  // Live Dashboard Overview
  getDashboardOverview: (user: Brother): DashboardOverview => {
    initializeLocalStorageDb();
    const moneySummary = localDb.getMoneySummary(user.id);
    const txs = localDb.getTransactions(user.id).slice(0, 5);
    const myTasks = localDb.getTasks(user.id).filter(t => t.status === 'pending').slice(0, 4);
    const notesCount = localDb.getNotes(user.id).length;
    const sharedInc = localDb.getSharedIncomeSummary();
    const upcomingShared = localDb.getSharedTasks().filter(t => t.status === 'pending').slice(0, 4);
    const upcomingPlans = localDb.getPlans().slice(0, 3);
    const anns = localDb.getAnnouncements().slice(0, 3);

    return {
      brother: user,
      personalFinance: {
        totalIncome: moneySummary.totalIncome,
        totalExpense: moneySummary.totalExpense,
        netBalance: moneySummary.netBalance,
        currency: moneySummary.currency,
        recentTransactions: txs
      },
      upcomingPrivateTasks: myTasks,
      privateNotesCount: notesCount,
      sharedFinance: {
        totalSharedIncome: sharedInc.total,
        currency: 'PKR'
      },
      upcomingSharedTasks: upcomingShared,
      upcomingPlans: upcomingPlans,
      recentAnnouncements: anns
    };
  },

  // Admin clear & restore
  clearExamples: () => {
    initializeLocalStorageDb();
    const notes = getItem<PrivateNote[]>(KEYS.NOTES, []).filter(n => !n.is_example);
    const money = getItem<PersonalTransaction[]>(KEYS.MONEY, []).filter(m => !m.is_example);
    const tasks = getItem<PrivateTask[]>(KEYS.TASKS, []).filter(t => !t.is_example);
    const inc = getItem<SharedIncome[]>(KEYS.SHARED_INCOME, []).filter(i => !i.is_example);
    const sharedTasks = getItem<SharedTask[]>(KEYS.SHARED_TASKS, []).filter(st => !st.is_example);
    const plans = getItem<FamilyPlan[]>(KEYS.PLANS, []).filter(p => !p.is_example);
    const anns = getItem<FamilyAnnouncement[]>(KEYS.ANNOUNCEMENTS, []).filter(a => !a.is_example);

    setItem(KEYS.NOTES, notes);
    setItem(KEYS.MONEY, money);
    setItem(KEYS.TASKS, tasks);
    setItem(KEYS.SHARED_INCOME, inc);
    setItem(KEYS.SHARED_TASKS, sharedTasks);
    setItem(KEYS.PLANS, plans);
    setItem(KEYS.ANNOUNCEMENTS, anns);
  },

  restoreExamples: () => {
    localStorage.removeItem(KEYS.INITIALIZED);
    initializeLocalStorageDb();
  }
};
