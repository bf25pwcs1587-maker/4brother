import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Database,
  Users,
  Copy,
  Check,
  Server,
  Trash2,
  RefreshCw,
  KeyRound,
  FileCode,
  AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api.ts';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged?: () => void;
}

const SUPABASE_SQL = `-- ==============================================================================
-- 4broters — PostgreSQL Schema & Row Level Security (RLS) Migrations
-- Family Hub for: Mahmood Khan, Azhar Mahmood, Talha Mahmood, Sabaz Ali Khan
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FAMILY PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    brother_key TEXT NOT NULL UNIQUE CHECK (brother_key IN ('mahmood', 'azhar', 'talha', 'sabaz')),
    avatar_color TEXT NOT NULL DEFAULT '#0d9488',
    role TEXT NOT NULL DEFAULT 'brother' CHECK (role IN ('brother', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated family members" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 3. PRIVATE NOTES (STRICT RLS: USER ONLY)
CREATE TABLE IF NOT EXISTS public.private_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    is_example BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private notes: viewable only by owner" ON public.private_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private notes: insertable only by owner" ON public.private_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private notes: updatable only by owner" ON public.private_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private notes: deletable only by owner" ON public.private_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. PERSONAL TRANSACTIONS (INCOME & EXPENSE - STRICT RLS)
CREATE TABLE IF NOT EXISTS public.personal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'PKR',
    description TEXT NOT NULL CHECK (char_length(description) >= 1),
    category TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_example BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.personal_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Personal money: viewable only by owner" ON public.personal_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Personal money: insertable only by owner" ON public.personal_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Personal money: updatable only by owner" ON public.personal_transactions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Personal money: deletable only by owner" ON public.personal_transactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. PRIVATE TASKS (STRICT RLS)
CREATE TABLE IF NOT EXISTS public.private_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    description TEXT DEFAULT '',
    due_date DATE,
    due_time TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    category TEXT NOT NULL DEFAULT 'Personal',
    is_example BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.private_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Private tasks: viewable only by owner" ON public.private_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private tasks: insertable only by owner" ON public.private_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Private tasks: updatable only by owner" ON public.private_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Private tasks: deletable only by owner" ON public.private_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. SHARED FAMILY INCOME (ALL 4 BROTHERS CAN VIEW & ADD)
CREATE TABLE IF NOT EXISTS public.shared_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'PKR',
    source_category TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT DEFAULT '',
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL,
    updated_by_name TEXT,
    is_example BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.shared_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shared income: all family can view" ON public.shared_income FOR SELECT TO authenticated USING (true);
CREATE POLICY "Shared income: all family can insert" ON public.shared_income FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Shared income: all family can update" ON public.shared_income FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Shared income: all family can delete" ON public.shared_income FOR DELETE TO authenticated USING (true);

-- 7. SHARED FAMILY TASKS, PLANS & ANNOUNCEMENTS
-- (Same pattern: RLS enabled with authenticated family access)`;

export const DeploymentGuideModal: React.FC<DeploymentGuideModalProps> = ({
  isOpen,
  onClose,
  onDataChanged
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'supabase' | 'privacy' | 'data'>('admin');
  const [copied, setCopied] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearExamples = async () => {
    if (!window.confirm('Are you sure you want to remove all sample [Example] records? This will leave only real records added by the brothers.')) {
      return;
    }
    setClearing(true);
    setActionMessage(null);
    try {
      const res = await api.admin.clearExamples();
      setActionMessage(res.message);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setActionMessage('Failed to clear examples: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  const handleRestoreExamples = async () => {
    setRestoring(true);
    setActionMessage(null);
    try {
      const res = await api.admin.restoreExamples();
      setActionMessage(res.message);
      if (onDataChanged) onDataChanged();
    } catch (err: any) {
      setActionMessage('Failed to restore examples: ' + err.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Server className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 font-serif-title">4broters Architecture & Setup Guide</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  Backend Verified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Accounts, database migrations, Row Level Security, and administrator controls.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-100 px-6 bg-white overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'admin'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            1. Administrator & 4 Accounts
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            2. Privacy & Row Level Security
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'supabase'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            3. Supabase / PostgreSQL SQL
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'data'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            4. Sample Data & Environment
          </button>
        </div>

        {/* Tab content area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-slate-700">
          {activeTab === 'admin' && (
            <div className="space-y-5">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex gap-3 text-amber-900">
                <KeyRound className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-semibold text-amber-950 mb-1">
                    No Public Registration Allowed
                  </p>
                  <p>
                    In accordance with family security requirements, public self-signup is disabled.
                    Only the four designated brothers possess accounts. The family administrator provisions the accounts
                    and securely issues login credentials to each brother.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-3">
                  The Four Brother Accounts & Credentials
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-blue-900 text-white text-xs font-bold flex items-center justify-center">
                        MK
                      </div>
                      <span className="font-bold text-slate-900">Mahmood Khan</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">mahmood@4broters.local</p>
                    <p className="text-[11px] text-slate-600 mt-1">Default Passcode: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">mahmood2026</code></p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-800 text-white text-xs font-bold flex items-center justify-center">
                        AM
                      </div>
                      <span className="font-bold text-slate-900">Azhar Mahmood</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">azhar@4broters.local</p>
                    <p className="text-[11px] text-slate-600 mt-1">Default Passcode: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">azhar2026</code></p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-purple-800 text-white text-xs font-bold flex items-center justify-center">
                        TM
                      </div>
                      <span className="font-bold text-slate-900">Talha Mahmood</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">talha@4broters.local</p>
                    <p className="text-[11px] text-slate-600 mt-1">Default Passcode: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">talha2026</code></p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-6 h-6 rounded-md bg-amber-800 text-white text-xs font-bold flex items-center justify-center">
                        SK
                      </div>
                      <span className="font-bold text-slate-900">Sabaz Ali Khan</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">sabaz@4broters.local</p>
                    <p className="text-[11px] text-slate-600 mt-1">Default Passcode: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold">sabaz2026</code></p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 text-xs text-slate-600 space-y-2">
                <p className="font-semibold text-slate-800">Administrator Setup Procedure:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Upon initial deployment, the database seeds the four brothers with salted PBKDF2 hash passwords.</li>
                  <li>Each brother logs in using their designated brother card or email + passcode.</li>
                  <li>Each brother can update their personal password at any time via the profile menu (which cannot be viewed by other brothers).</li>
                  <li>In Supabase deployment, the administrator adds these 4 users directly under <strong>Supabase Dashboard &gt; Authentication &gt; Users</strong> and turns off "Enable email signups".</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 text-emerald-950">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-emerald-900 mb-1">
                    Strict Backend Authorization & Row Level Security
                  </p>
                  <p>
                    Privacy is enforced <strong>at the server API layer and database engine level</strong>, not merely in the browser UI.
                    Even if someone attempts to manipulate URLs, HTTP headers, or browser storage:
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-900">1. Private Notes Isolation:</span>
                  <p className="text-slate-600">
                    The backend queries <code>SELECT ... WHERE user_id = authenticated_user_id</code>. Modifying or deleting any note checks
                    <code>WHERE id = :id AND user_id = :auth_id</code>, responding with <code>403 Forbidden</code> if any other brother’s record is targeted.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-900">2. Personal Money Tracker Isolation:</span>
                  <p className="text-slate-600">
                    Each brother's income, expenses, and transaction logs are bound to their private account. Summaries and breakdowns are calculated exclusively on their own records.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-900">3. Private Tasks Isolation:</span>
                  <p className="text-slate-600">
                    Personal to-do items, reminders, and due dates are strictly restricted to the owning brother.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-900">4. Shared Family Space with Audit Trails:</span>
                  <p className="text-slate-600">
                    Shared family income, shared tasks, plans, and announcements are readable and editable by all 4 brothers. Every shared item stores <code>created_by_name</code>, <code>updated_by_name</code>, and timestamps so everyone knows who contributed each entry.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Supabase PostgreSQL SQL Migration</h4>
                  <p className="text-xs text-slate-500">
                    Located in <code>/supabase/migrations/20261013000000_init_4broters_schema.sql</code>
                  </p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied to Clipboard!' : 'Copy SQL Script'}
                </button>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                  {SUPABASE_SQL}
                </pre>
              </div>

              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 space-y-1">
                <p className="font-bold">How to apply on Supabase:</p>
                <ol className="list-decimal pl-4 space-y-0.5 text-indigo-900">
                  <li>Create a new project at <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-medium">supabase.com</a></li>
                  <li>Navigate to <strong>SQL Editor</strong> &gt; <strong>New Query</strong>.</li>
                  <li>Paste the copied SQL above and click <strong>Run</strong>.</li>
                  <li>In <strong>Authentication &gt; Providers &gt; Email</strong>, ensure email auth is enabled and "Confirm email" can be toggled as preferred.</li>
                  <li>In <strong>Authentication &gt; URL Configuration</strong>, disable public signups.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-slate-700" />
                  <h4 className="font-bold text-slate-900 text-sm">Sample Example Records</h4>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  All initial demonstrative entries are clearly marked with <code>[Example]</code> in their title.
                  Once the brothers begin entering their real data, the administrator can remove all sample records with one click.
                </p>

                {actionMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                    {actionMessage}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    onClick={handleClearExamples}
                    disabled={clearing}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {clearing ? 'Clearing...' : 'Clear All [Example] Records'}
                  </button>
                  <button
                    onClick={handleRestoreExamples}
                    disabled={restoring}
                    className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {restoring ? 'Restoring...' : 'Restore Example Records'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Environment Variables Configuration (.env)
                </h4>
                <pre className="bg-slate-900 text-slate-200 p-3.5 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
{`# Server Port
PORT=3000

# Secret for session signing
SESSION_SECRET="random-secure-32-char-token"

# Optional Supabase direct connection
# (Only public browser anon key is used; secrets are NEVER exposed in frontend code)
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-public-anon-key"`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Website name: <strong className="text-slate-800">4broters</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
