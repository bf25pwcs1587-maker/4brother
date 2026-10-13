import React, { useEffect, useState } from 'react';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Wallet,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  ArrowRight,
  Plus,
  FileText,
  AlertCircle,
  Pin,
  Lock,
  DollarSign,
  KeyRound,
  User,
  MessageCircle,
  ExternalLink,
  Send,
  Camera
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api, getWhatsAppUrl } from '../lib/api.ts';
import { DashboardOverview } from '../types/index.ts';

interface DashboardViewProps {
  onNavigate: (tab: 'private' | 'shared', subTab?: string) => void;
  onOpenQuickAction: (action: 'private-expense' | 'private-task' | 'private-note' | 'shared-income' | 'shared-plan') => void;
  onOpenProfile?: (tab?: 'profile' | 'password') => void;
}

const FOUR_BROTHERS_CONTACTS = [
  { key: 'talha', name: 'Talha Mahmood', phone: '03255691055', color: '#5b21b6', role: 'Brother' },
  { key: 'mahmood', name: 'Mahmood Khan', phone: '03109796509', color: '#1e3a8a', role: 'Brother' },
  { key: 'azhar', name: 'Azhar Mahmood', phone: '+971 55 955 3018', color: '#065f46', role: 'Brother' },
  { key: 'sabaz', name: 'Sabaz Ali Khan', phone: '03159944181', color: '#92400e', role: 'Brother' }
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickAction,
  onOpenProfile
}) => {
  const { user, familyMembers } = useAuth();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.getOverview();
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handleTogglePrivateTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    try {
      await api.privateTasks.toggleStatus(taskId, newStatus);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleSharedTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    try {
      await api.sharedTasks.toggleStatus(taskId, newStatus);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-slate-500 font-medium">Loading 4broters family dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800">
        <div className="flex items-center gap-2 mb-2 font-bold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Error loading dashboard</span>
        </div>
        <p className="text-xs mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-rose-700 text-white rounded-xl text-xs font-semibold hover:bg-rose-800"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { personalFinance, upcomingPrivateTasks, sharedFinance, upcomingSharedTasks, upcomingPlans, recentAnnouncements } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* 1. Welcome Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Decorative blur circles */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg overflow-hidden shrink-0 border-2 border-white/20"
              style={{ backgroundColor: user?.avatar_color || '#1e3a8a' }}
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                user?.full_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
              )}
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-semibold backdrop-blur-md mb-2 border border-white/10">
                <Shield className="w-3.5 h-3.5" />
                <span>Private Vault · Strict RLS Security</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-serif-title">
                Welcome, {user?.full_name}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                Personal & shared family hub for Mahmood, Azhar, Talha & Sabaz.
                Your private finances, tasks, and notes are strictly isolated to your account.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => onOpenQuickAction('private-expense')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
            <button
              onClick={() => onOpenQuickAction('private-task')}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Task</span>
            </button>
            <button
              onClick={() => onOpenQuickAction('shared-income')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Shared Income</span>
            </button>
          </div>
        </div>

        {/* Quick Profile & Password Actions Bar */}
        {onOpenProfile && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onOpenProfile('password')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>How to Change Password</span>
              </button>

              <button
                onClick={() => onOpenProfile('profile')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-300" />
                <span>Add / Edit Profile Photo & Email</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-slate-300 text-[11px]">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp Alerts: <strong className="text-white">{user?.phone_number || 'Configured'}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Metric Cards Row: Clearly labeled Private vs Shared */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personal Net Balance (Private) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-indigo-600" />
              <span>Personal Balance</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
              Private
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {personalFinance.currency} {personalFinance.netBalance.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100">
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              +{personalFinance.totalIncome.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <TrendingDown className="w-3.5 h-3.5" />
              -{personalFinance.totalExpense.toLocaleString()}
            </span>
          </div>
        </div>

        {/* My Upcoming Tasks (Private) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-indigo-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-indigo-600" />
              <span>My Pending Tasks</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
              Private
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {upcomingPrivateTasks.length}
            </span>
            <span className="text-xs text-slate-500">active tasks</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100">
            <button
              onClick={() => onNavigate('private', 'tasks')}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <span>Manage tasks</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-slate-400 text-[11px]">{data.privateNotesCount} notes saved</span>
          </div>
        </div>

        {/* Shared Family Income (Shared) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-emerald-700" />
              <span>Shared Family Pool</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[10px]">
              Shared
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {sharedFinance.currency} {sharedFinance.totalSharedIncome.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100">
            <button
              onClick={() => onNavigate('shared', 'income')}
              className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
            >
              <span>View pool ledger</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-slate-400 text-[11px]">Collective fund</span>
          </div>
        </div>

        {/* Family Tasks & Gatherings (Shared) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-3 h-3 text-emerald-700" />
              <span>Family Gatherings</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold text-[10px]">
              Shared
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {upcomingPlans.length}
            </span>
            <span className="text-xs text-slate-500">plans upcoming</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2.5 border-t border-slate-100">
            <button
              onClick={() => onNavigate('shared', 'plans')}
              className="text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
            >
              <span>View calendar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="text-slate-400 text-[11px]">{upcomingSharedTasks.length} shared tasks</span>
          </div>
        </div>
      </div>

      {/* 3. WhatsApp Automated Task Alert Directory for 4 Brothers */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  4 Brothers WhatsApp Task Alert Directory
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  Automated Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-500">
                When any brother assigns a task to another brother, automated WhatsApp notifications are generated with task title, due date, and details.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenQuickAction('shared-plan')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Assign Shared Task</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {FOUR_BROTHERS_CONTACTS.map((brother) => {
            const liveMember = familyMembers.find((m) => m.brother_key === brother.key);
            const phone = liveMember?.phone_number || brother.phone;
            const displayName = liveMember?.full_name || brother.name;
            const avatarImg = liveMember?.avatar_url || null;
            const pingMsg = `Assalamu Alaikum ${displayName}! Checking in from 4broters Family Hub.`;
            const waUrl = getWhatsAppUrl(phone, pingMsg);

            return (
              <div
                key={brother.key}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs overflow-hidden"
                    style={{ backgroundColor: brother.color }}
                  >
                    {avatarImg ? (
                      <img src={avatarImg} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      displayName.split(' ').map((n) => n[0]).join('').slice(0, 2)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-emerald-800 font-mono font-semibold">{phone}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                  <span className="text-slate-400">WhatsApp Alert</span>
                  {waUrl ? (
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Ping</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Split Grid: Private Vault Tasks vs Shared Family Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: PRIVATE VAULT */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-serif-title">
                My Private Space (Eyes Only)
              </h2>
            </div>
            <button
              onClick={() => onNavigate('private')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
            >
              <span>Full Private Vault</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Pending Private Tasks */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span>My Pending Tasks</span>
              </h3>
              <button
                onClick={() => onNavigate('private', 'tasks')}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View all ({upcomingPrivateTasks.length})
              </button>
            </div>

            {upcomingPrivateTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No pending private tasks. All clear!
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingPrivateTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <button
                      onClick={() => handleTogglePrivateTask(t.id, t.status)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center"></div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">{t.title}</span>
                        {t.priority === 'high' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                            High
                          </span>
                        )}
                      </div>
                      {t.due_date && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Due {t.due_date} {t.due_time || ''}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SHARED FAMILY HUB */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 font-serif-title">
                Shared Family Space (All 4 Brothers)
              </h2>
            </div>
            <button
              onClick={() => onNavigate('shared')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-colors"
            >
              <span>Full Family Hub</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Shared Family Announcements */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Pin className="w-4 h-4 text-emerald-600" />
                <span>Recent Family Announcements</span>
              </h3>
              <button
                onClick={() => onNavigate('shared', 'announcements')}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-medium"
              >
                View all
              </button>
            </div>

            {recentAnnouncements.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No family announcements currently posted.
              </div>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900">{ann.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                        {ann.tag}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {ann.content}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Posted by {ann.created_by_name}</span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared Family Tasks with WhatsApp alert indicators */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>Upcoming Family Tasks</span>
              </h3>
              <button
                onClick={() => onNavigate('shared', 'tasks')}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-medium"
              >
                View all
              </button>
            </div>

            {upcomingSharedTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No pending family tasks.
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingSharedTasks.map((st) => (
                  <div
                    key={st.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start gap-3"
                  >
                    <button
                      onClick={() => handleToggleSharedTask(st.id, st.status)}
                      className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <div className="w-4 h-4 rounded border border-slate-300 flex items-center justify-center"></div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {st.title}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 shrink-0">
                          Assigned: {st.assigned_to_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Added by {st.created_by_name} {st.due_date ? `· Due ${st.due_date}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
