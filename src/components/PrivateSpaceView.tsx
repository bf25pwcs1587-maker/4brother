import React, { useState, useEffect } from 'react';
import {
  Lock,
  Wallet,
  CheckCircle2,
  FileText,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Trash2,
  Edit2,
  Search,
  Filter,
  Pin,
  AlertCircle,
  Tag
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import { PrivateNote, PersonalTransaction, PrivateTask } from '../types/index.ts';
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx';

interface PrivateSpaceViewProps {
  initialSubTab?: string;
  defaultAction?: 'private-expense' | 'private-task' | 'private-note' | null;
  onClearAction?: () => void;
}

const MONEY_CATEGORIES = [
  'Salary/Professional',
  'Business',
  'Investments',
  'Household',
  'Health & Medical',
  'Education/Tech',
  'Transport/Vehicle',
  'Travel & Leisure',
  'Gifts & Charity',
  'Other'
];

const NOTE_CATEGORIES = ['General', 'Personal', 'Projects', 'Ideas', 'Health', 'Farming', 'Important'];

export const PrivateSpaceView: React.FC<PrivateSpaceViewProps> = ({
  initialSubTab = 'money',
  defaultAction = null,
  onClearAction
}) => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<'money' | 'tasks' | 'notes'>(
    (initialSubTab as any) || 'money'
  );

  // Data states
  const [transactions, setTransactions] = useState<PersonalTransaction[]>([]);
  const [moneySummary, setMoneySummary] = useState<any>(null);
  const [tasks, setTasks] = useState<PrivateTask[]>([]);
  const [notes, setNotes] = useState<PrivateNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & form states
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<PersonalTransaction | null>(null);
  const [txForm, setTxForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    currency: 'PKR',
    description: '',
    category: 'Household',
    date: new Date().toISOString().split('T')[0]
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<PrivateTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '12:00',
    priority: 'medium' as 'low' | 'medium' | 'high',
    category: 'Personal'
  });

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PrivateNote | null>(null);
  const [noteForm, setNoteForm] = useState({
    title: '',
    content: '',
    category: 'General',
    is_pinned: false
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'transaction' | 'task' | 'note' | null;
    id: string | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [txFilterType, setTxFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [txSearch, setTxSearch] = useState('');
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [noteSearch, setNoteSearch] = useState('');

  // Initial load
  const loadData = async () => {
    setLoading(true);
    try {
      const [txsRes, summaryRes, tlistRes, nlistRes] = await Promise.allSettled([
        api.privateMoney.getAll(),
        api.privateMoney.getSummary(),
        api.privateTasks.getAll(),
        api.privateNotes.getAll()
      ]);
      if (txsRes.status === 'fulfilled') setTransactions(Array.isArray(txsRes.value) ? txsRes.value : []);
      if (summaryRes.status === 'fulfilled') setMoneySummary(summaryRes.value || { totalIncome: 0, totalExpense: 0, netBalance: 0, currency: 'PKR', categoryBreakdown: [] });
      if (tlistRes.status === 'fulfilled') setTasks(Array.isArray(tlistRes.value) ? tlistRes.value : []);
      if (nlistRes.status === 'fulfilled') setNotes(Array.isArray(nlistRes.value) ? nlistRes.value : []);
    } catch (err: any) {
      console.error('Failed to load private data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Handle default actions passed from dashboard
  useEffect(() => {
    if (defaultAction === 'private-expense') {
      setSubTab('money');
      setEditingTx(null);
      setTxError(null);
      setTxForm({
        type: 'expense',
        amount: '',
        currency: 'PKR',
        description: '',
        category: 'Household',
        date: new Date().toISOString().split('T')[0]
      });
      setIsTxModalOpen(true);
      if (onClearAction) onClearAction();
    } else if (defaultAction === 'private-task') {
      setSubTab('tasks');
      setEditingTask(null);
      setTaskError(null);
      setTaskForm({
        title: '',
        description: '',
        due_date: new Date().toISOString().split('T')[0],
        due_time: '12:00',
        priority: 'medium',
        category: 'Personal'
      });
      setIsTaskModalOpen(true);
      if (onClearAction) onClearAction();
    } else if (defaultAction === 'private-note') {
      setSubTab('notes');
      setEditingNote(null);
      setNoteError(null);
      setNoteForm({
        title: '',
        content: '',
        category: 'General',
        is_pinned: false
      });
      setIsNoteModalOpen(true);
      if (onClearAction) onClearAction();
    }
  }, [defaultAction]);

  // --- Transactions Handlers ---
  const handleSaveTx = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    const cleanAmount = String(txForm.amount).replace(/[^0-9.]/g, '');
    const amountNum = parseFloat(cleanAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTxError('Please enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTx) {
        await api.privateMoney.update(editingTx.id, {
          ...txForm,
          amount: amountNum
        });
      } else {
        await api.privateMoney.create({
          ...txForm,
          amount: amountNum
        });
      }
      setIsTxModalOpen(false);
      setEditingTx(null);
      setTxError(null);
      await loadData();
    } catch (err: any) {
      setTxError(err.message || 'Failed to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTx = (tx: PersonalTransaction) => {
    setEditingTx(tx);
    setTxError(null);
    setTxForm({
      type: tx.type,
      amount: String(tx.amount),
      currency: tx.currency,
      description: tx.description,
      category: tx.category,
      date: tx.date
    });
    setIsTxModalOpen(true);
  };

  // --- Tasks Handlers ---
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError(null);
    if (!taskForm.title.trim()) {
      setTaskError('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingTask) {
        await api.privateTasks.update(editingTask.id, taskForm);
      } else {
        await api.privateTasks.create(taskForm);
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
      setTaskError(null);
      await loadData();
    } catch (err: any) {
      setTaskError(err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (task: PrivateTask) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      // Optimistic update
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
      await api.privateTasks.toggleStatus(task.id, newStatus);
      loadData();
    } catch (err: any) {
      console.error('Failed to update task status:', err);
      loadData();
    }
  };

  const handleEditTask = (task: PrivateTask) => {
    setEditingTask(task);
    setTaskError(null);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      due_time: task.due_time || '',
      priority: task.priority,
      category: task.category
    });
    setIsTaskModalOpen(true);
  };

  // --- Notes Handlers ---
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError(null);
    if (!noteForm.title.trim()) {
      setNoteError('Note title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingNote) {
        await api.privateNotes.update(editingNote.id, noteForm);
      } else {
        await api.privateNotes.create(noteForm);
      }
      setIsNoteModalOpen(false);
      setEditingNote(null);
      setNoteError(null);
      await loadData();
    } catch (err: any) {
      setNoteError(err.message || 'Failed to save note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNote = (note: PrivateNote) => {
    setEditingNote(note);
    setNoteError(null);
    setNoteForm({
      title: note.title,
      content: note.content,
      category: note.category,
      is_pinned: Boolean(note.is_pinned)
    });
    setIsNoteModalOpen(true);
  };

  // --- Deletion Handler ---
  const handleConfirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'transaction') {
        await api.privateMoney.delete(deleteModal.id);
      } else if (deleteModal.type === 'task') {
        await api.privateTasks.delete(deleteModal.id);
      } else if (deleteModal.type === 'note') {
        await api.privateNotes.delete(deleteModal.id);
      }
      setDeleteModal({ isOpen: false, type: null, id: null, name: '' });
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered lists
  const filteredTxs = transactions.filter((tx) => {
    if (txFilterType !== 'all' && tx.type !== txFilterType) return false;
    if (txSearch && !tx.description.toLowerCase().includes(txSearch.toLowerCase()) && !tx.category.toLowerCase().includes(txSearch.toLowerCase())) {
      return false;
    }
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'pending') return t.status === 'pending';
    if (taskFilter === 'completed') return t.status === 'completed';
    if (taskFilter === 'overdue') {
      return t.status === 'pending' && t.due_date && t.due_date < todayStr;
    }
    return true;
  });

  const filteredNotes = notes.filter((n) => {
    if (!noteSearch) return true;
    return (
      n.title.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.content.toLowerCase().includes(noteSearch.toLowerCase()) ||
      n.category.toLowerCase().includes(noteSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Privacy Header */}
      <div className="bg-indigo-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/15">
              <Lock className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif-title">Private Space</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  {user?.full_name} Only
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Your personal money records, private tasks, and personal notes are isolated to your account.
              </p>
            </div>
          </div>

          {/* Sub-tab navigation pill buttons */}
          <div className="flex items-center p-1 bg-indigo-950/60 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setSubTab('money')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                subTab === 'money' ? 'bg-white text-indigo-950 shadow-xs' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Money Tracker</span>
            </button>
            <button
              onClick={() => setSubTab('tasks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                subTab === 'tasks' ? 'bg-white text-indigo-950 shadow-xs' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>My Tasks</span>
            </button>
            <button
              onClick={() => setSubTab('notes')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                subTab === 'notes' ? 'bg-white text-indigo-950 shadow-xs' : 'text-indigo-200 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Private Notes</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* ================================================================= */}
          {/* SUBTAB 1: MONEY TRACKER */}
          {/* ================================================================= */}
          {subTab === 'money' && (
            <div className="space-y-6">
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Income</span>
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-700 font-mono">
                    {moneySummary?.currency || 'PKR'} {moneySummary?.totalIncome?.toLocaleString() || 0}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Expenses</span>
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-rose-700 font-mono">
                    {moneySummary?.currency || 'PKR'} {moneySummary?.totalExpense?.toLocaleString() || 0}
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Net Balance</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 font-mono">
                    {moneySummary?.currency || 'PKR'} {moneySummary?.netBalance?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              {/* Transactions Header & Controls */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">Personal Transactions</h2>
                    <span className="text-xs text-slate-400">({filteredTxs.length} entries)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search description or category..."
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        className="pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="flex p-0.5 bg-slate-100 rounded-xl text-xs">
                      <button
                        onClick={() => setTxFilterType('all')}
                        className={`px-3 py-1 rounded-lg font-medium ${txFilterType === 'all' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setTxFilterType('income')}
                        className={`px-3 py-1 rounded-lg font-medium ${txFilterType === 'income' ? 'bg-white shadow-2xs text-emerald-800 font-bold' : 'text-slate-600'}`}
                      >
                        Income
                      </button>
                      <button
                        onClick={() => setTxFilterType('expense')}
                        className={`px-3 py-1 rounded-lg font-medium ${txFilterType === 'expense' ? 'bg-white shadow-2xs text-rose-800 font-bold' : 'text-slate-600'}`}
                      >
                        Expense
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setEditingTx(null);
                        setTxForm({
                          type: 'expense',
                          amount: '',
                          currency: 'PKR',
                          description: '',
                          category: 'Household',
                          date: new Date().toISOString().split('T')[0]
                        });
                        setIsTxModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Entry</span>
                    </button>
                  </div>
                </div>

                {/* Table or Cards */}
                {filteredTxs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No transactions found for this view.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredTxs.map((tx) => (
                      <div
                        key={tx.id}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {tx.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{tx.description}</span>
                              {Boolean(tx.is_example) && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/50">
                                  Example
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {tx.category} · {tx.date}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <span
                            className={`font-mono font-bold text-sm ${
                              tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}{tx.currency} {tx.amount.toLocaleString()}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditTx(tx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'transaction',
                                  id: tx.id,
                                  name: `${tx.description} (${tx.currency} ${tx.amount})`
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUBTAB 2: PRIVATE TASKS */}
          {/* ================================================================= */}
          {subTab === 'tasks' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Personal Tasks & Reminders</h2>
                    <p className="text-xs text-slate-500">Track tasks with due dates, times, and priority levels.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex p-0.5 bg-slate-100 rounded-xl text-xs">
                      <button
                        onClick={() => setTaskFilter('all')}
                        className={`px-3 py-1 rounded-lg font-medium ${taskFilter === 'all' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setTaskFilter('pending')}
                        className={`px-3 py-1 rounded-lg font-medium ${taskFilter === 'pending' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'}`}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => setTaskFilter('overdue')}
                        className={`px-3 py-1 rounded-lg font-medium ${taskFilter === 'overdue' ? 'bg-white shadow-2xs text-rose-700 font-bold' : 'text-slate-600'}`}
                      >
                        Overdue
                      </button>
                      <button
                        onClick={() => setTaskFilter('completed')}
                        className={`px-3 py-1 rounded-lg font-medium ${taskFilter === 'completed' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600'}`}
                      >
                        Completed
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setTaskForm({
                          title: '',
                          description: '',
                          due_date: new Date().toISOString().split('T')[0],
                          due_time: '12:00',
                          priority: 'medium',
                          category: 'Personal'
                        });
                        setIsTaskModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Task</span>
                    </button>
                  </div>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No tasks match the active filter.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredTasks.map((t) => {
                      const isOverdue = t.status === 'pending' && t.due_date && t.due_date < todayStr;
                      const isDone = t.status === 'completed';

                      return (
                        <div
                          key={t.id}
                          className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                            isDone
                              ? 'bg-slate-50/70 border-slate-200/60 opacity-75'
                              : isOverdue
                              ? 'bg-rose-50/30 border-rose-200'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <button
                            onClick={() => handleToggleTaskStatus(t)}
                            className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <div className="w-5 h-5 rounded-md border border-slate-300 hover:border-indigo-600 flex items-center justify-center"></div>
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  isDone ? 'line-through text-slate-500' : 'text-slate-900'
                                }`}
                              >
                                {t.title}
                              </span>

                              {t.priority === 'high' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-100">
                                  High Priority
                                </span>
                              )}

                              {isOverdue && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-600 text-white">
                                  Overdue
                                </span>
                              )}

                              <span className="px-2 py-0.2 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                {t.category}
                              </span>

                              {Boolean(t.is_example) && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700">
                                  Example
                                </span>
                              )}
                            </div>

                            {t.description && (
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                            )}

                            {t.due_date && (
                              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-2">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Due: {t.due_date} {t.due_time || ''}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditTask(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'task',
                                  id: t.id,
                                  name: t.title
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* SUBTAB 3: PRIVATE NOTES */}
          {/* ================================================================= */}
          {subTab === 'notes' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Personal Notes & Reflections</h2>
                    <p className="text-xs text-slate-500">Private notebook and records for {user?.full_name}.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search notes..."
                        value={noteSearch}
                        onChange={(e) => setNoteSearch(e.target.value)}
                        className="pl-8.5 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <button
                      onClick={() => {
                        setEditingNote(null);
                        setNoteForm({
                          title: '',
                          content: '',
                          category: 'General',
                          is_pinned: false
                        });
                        setIsNoteModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Note</span>
                    </button>
                  </div>
                </div>

                {filteredNotes.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No notes found. Create your first private note above.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNotes.map((n) => (
                      <div
                        key={n.id}
                        className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                          Boolean(n.is_pinned)
                            ? 'bg-indigo-50/40 border-indigo-200 shadow-xs ring-1 ring-indigo-500/10'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-slate-900 leading-snug">
                              {n.title}
                            </span>
                            {Boolean(n.is_pinned) && (
                              <Pin className="w-3.5 h-3.5 text-indigo-600 shrink-0 rotate-45" />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                            {n.content}
                          </p>
                        </div>

                        <div className="pt-3.5 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                            {n.category}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditNote(n)}
                              className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'note',
                                  id: n.id,
                                  name: n.title
                                })
                              }
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* --- ADD / EDIT TRANSACTION MODAL --- */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingTx ? 'Edit Transaction' : 'Record Personal Transaction'}
              </h3>
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTx} className="p-6 space-y-4">
              {txError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{txError}</span>
                </div>
              )}
              <div className="flex p-1 bg-slate-100 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setTxForm({ ...txForm, type: 'expense' })}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    txForm.type === 'expense' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Expense (-)
                </button>
                <button
                  type="button"
                  onClick={() => setTxForm({ ...txForm, type: 'income' })}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                    txForm.type === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Income (+)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Household electricity bill"
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                  <input
                    type="text"
                    value={txForm.currency}
                    onChange={(e) => setTxForm({ ...txForm, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={txForm.category}
                    onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  >
                    {MONEY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={txForm.date}
                    onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingTx ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT TASK MODAL --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingTask ? 'Edit Task' : 'New Private Task'}
              </h3>
              <button
                onClick={() => setIsTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-4">
              {taskError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{taskError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule vehicle oil service"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Details (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes or checklist..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.due_date}
                    onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Due Time</label>
                  <input
                    type="time"
                    value={taskForm.due_time}
                    onChange={(e) => setTaskForm({ ...taskForm, due_time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <input
                    type="text"
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    placeholder="Personal, Work, Health..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingTask ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT NOTE MODAL --- */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingNote ? 'Edit Private Note' : 'Write Private Note'}
              </h3>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
              {noteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{noteError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Note Title</label>
                <input
                  type="text"
                  required
                  placeholder="Note title..."
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Content</label>
                <textarea
                  rows={5}
                  required
                  placeholder="Write your personal thoughts or details..."
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={noteForm.category}
                    onChange={(e) => setNoteForm({ ...noteForm, category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {NOTE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={noteForm.is_pinned}
                      onChange={(e) => setNoteForm({ ...noteForm, is_pinned: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <span>Pin to Top</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingNote ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Private Record?"
        message="Are you sure you want to delete this private item? It will be permanently removed from your personal vault."
        itemName={deleteModal.name}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: null, id: null, name: '' })}
      />
    </div>
  );
};
