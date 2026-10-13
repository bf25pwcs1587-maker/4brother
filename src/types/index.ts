export interface Brother {
  id: string;
  email: string;
  full_name: string;
  brother_key: 'mahmood' | 'azhar' | 'talha' | 'sabaz';
  avatar_color: string;
  avatar_url?: string | null;
  phone_number?: string | null;
  role: 'brother' | 'admin';
}

export interface PrivateNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: number | boolean;
  is_example: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalTransaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount: number;
  currency: string;
  description: string;
  category: string;
  date: string;
  is_example: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface PrivateTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  due_date: string | null;
  due_time: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed';
  category: string;
  is_example: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedIncome {
  id: string;
  title: string;
  amount: number;
  currency: string;
  source_category: string;
  date: string;
  notes: string;
  created_by_id: string | null;
  created_by_name: string;
  updated_by_name?: string;
  is_example: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface SharedTask {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  due_time: string;
  priority: 'low' | 'medium' | 'high';
  assigned_to_name: string;
  assigned_to_id: string | null;
  assigned_to_phone?: string | null;
  assigned_to_avatar?: string | null;
  status: 'pending' | 'completed';
  created_by_id: string | null;
  created_by_name: string;
  updated_by_name?: string;
  is_example: number | boolean;
  created_at: string;
  updated_at: string;
  whatsapp_notification?: {
    target_phone: string | null;
    recipient_name: string;
    message: string;
  };
}

export interface FamilyPlan {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  created_by_id: string | null;
  created_by_name: string;
  updated_by_name?: string;
  is_example: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface FamilyAnnouncement {
  id: string;
  title: string;
  content: string;
  tag: string;
  is_pinned: number | boolean;
  created_by_id: string | null;
  created_by_name: string;
  updated_by_name?: string;
  is_example: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardOverview {
  brother: Brother;
  personalFinance: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    currency: string;
    recentTransactions: PersonalTransaction[];
  };
  upcomingPrivateTasks: PrivateTask[];
  privateNotesCount: number;
  sharedFinance: {
    totalSharedIncome: number;
    currency: string;
  };
  upcomingSharedTasks: SharedTask[];
  upcomingPlans: FamilyPlan[];
  recentAnnouncements: FamilyAnnouncement[];
}
