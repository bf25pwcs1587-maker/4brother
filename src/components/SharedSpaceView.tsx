import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  CheckCircle2,
  Calendar,
  Pin,
  Plus,
  Trash2,
  Edit2,
  Clock,
  MapPin,
  Search,
  ExternalLink,
  Shield,
  Tag,
  MessageCircle,
  Send,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';
import {
  SharedIncome,
  SharedTask,
  FamilyPlan,
  FamilyAnnouncement
} from '../types/index.ts';
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx';
import { WhatsAppAlertModal } from './WhatsAppAlertModal.tsx';

interface SharedSpaceViewProps {
  initialSubTab?: string;
  defaultAction?: 'shared-income' | 'shared-plan' | null;
  onClearAction?: () => void;
}

const SHARED_INCOME_CATEGORIES = [
  'Family Property Rental',
  'Shared Agriculture / Harvest',
  'Family Commercial Plaza',
  'Joint Investment Dividend',
  'Shared Savings Contribution',
  'Other Collective Income'
];

export const SharedSpaceView: React.FC<SharedSpaceViewProps> = ({
  initialSubTab = 'income',
  defaultAction = null,
  onClearAction
}) => {
  const { user, familyMembers } = useAuth();
  const [subTab, setSubTab] = useState<'income' | 'tasks' | 'plans' | 'announcements'>(
    (initialSubTab as any) || 'income'
  );

  // Data states
  const [incomeList, setIncomeList] = useState<SharedIncome[]>([]);
  const [incomeSummary, setIncomeSummary] = useState<any>(null);
  const [tasksList, setTasksList] = useState<SharedTask[]>([]);
  const [plansList, setPlansList] = useState<FamilyPlan[]>([]);
  const [announcementsList, setAnnouncementsList] = useState<FamilyAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & forms
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<SharedIncome | null>(null);
  const [incomeForm, setIncomeForm] = useState({
    title: '',
    amount: '',
    currency: 'PKR',
    source_category: 'Family Property Rental',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<SharedTask | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '14:00',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assigned_to_name: 'All Brothers',
    assigned_to_id: ''
  });

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<FamilyPlan | null>(null);
  const [planForm, setPlanForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '19:00',
    location: ''
  });

  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [editingAnn, setEditingAnn] = useState<FamilyAnnouncement | null>(null);
  const [annForm, setAnnForm] = useState({
    title: '',
    content: '',
    tag: 'Family News',
    is_pinned: false
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'income' | 'task' | 'plan' | 'announcement' | null;
    id: string | null;
    name: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    name: ''
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // WhatsApp Alert modal state
  const [whatsAppModal, setWhatsAppModal] = useState<{
    isOpen: boolean;
    taskTitle: string;
    assignedToName: string;
    assignedToPhone?: string | null;
    dueDate?: string | null;
    dueTime?: string | null;
    description?: string;
    createdByName?: string;
  }>({
    isOpen: false,
    taskTitle: '',
    assignedToName: '',
    assignedToPhone: null,
    dueDate: null,
    dueTime: null,
    description: '',
    createdByName: ''
  });
  const [sendWhatsAppAlert, setSendWhatsAppAlert] = useState(true);

  // Filters
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [incomeError, setIncomeError] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [annError, setAnnError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial load
  const loadSharedData = async () => {
    setLoading(true);
    try {
      const [incRes, summaryRes, tasksRes, plansRes, annsRes] = await Promise.allSettled([
        api.sharedIncome.getAll(),
        api.sharedIncome.getSummary(),
        api.sharedTasks.getAll(),
        api.familyPlans.getAll(),
        api.announcements.getAll()
      ]);
      if (incRes.status === 'fulfilled') setIncomeList(Array.isArray(incRes.value) ? incRes.value : []);
      if (summaryRes.status === 'fulfilled') setIncomeSummary(summaryRes.value || { total: 0, count: 0, currency: 'PKR', categories: [] });
      if (tasksRes.status === 'fulfilled') setTasksList(Array.isArray(tasksRes.value) ? tasksRes.value : []);
      if (plansRes.status === 'fulfilled') setPlansList(Array.isArray(plansRes.value) ? plansRes.value : []);
      if (annsRes.status === 'fulfilled') setAnnouncementsList(Array.isArray(annsRes.value) ? annsRes.value : []);
    } catch (err: any) {
      console.error('Failed to load shared space data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSharedData();
  }, [user]);

  // Handle default actions passed from dashboard
  useEffect(() => {
    if (defaultAction === 'shared-income') {
      setSubTab('income');
      setEditingIncome(null);
      setIncomeError(null);
      setIncomeForm({
        title: '',
        amount: '',
        currency: 'PKR',
        source_category: 'Family Property Rental',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setIsIncomeModalOpen(true);
      if (onClearAction) onClearAction();
    } else if (defaultAction === 'shared-plan') {
      setSubTab('plans');
      setEditingPlan(null);
      setPlanError(null);
      setPlanForm({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        time: '19:00',
        location: ''
      });
      setIsPlanModalOpen(true);
      if (onClearAction) onClearAction();
    }
  }, [defaultAction]);

  // --- Handlers: Shared Income ---
  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setIncomeError(null);
    const cleanAmount = String(incomeForm.amount).replace(/[^0-9.]/g, '');
    const amountNum = parseFloat(cleanAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setIncomeError('Please enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingIncome) {
        await api.sharedIncome.update(editingIncome.id, {
          ...incomeForm,
          amount: amountNum
        });
      } else {
        await api.sharedIncome.create({
          ...incomeForm,
          amount: amountNum
        });
      }
      setIsIncomeModalOpen(false);
      setEditingIncome(null);
      setIncomeError(null);
      await loadSharedData();
    } catch (err: any) {
      setIncomeError(err.message || 'Failed to save income record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditIncome = (inc: SharedIncome) => {
    setEditingIncome(inc);
    setIncomeError(null);
    setIncomeForm({
      title: inc.title,
      amount: String(inc.amount),
      currency: inc.currency,
      source_category: inc.source_category,
      date: inc.date,
      notes: inc.notes || ''
    });
    setIsIncomeModalOpen(true);
  };

  // --- Handlers: Shared Tasks ---
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError(null);
    if (!taskForm.title.trim()) {
      setTaskError('Title is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      let resultTask: any = null;
      if (editingTask) {
        resultTask = await api.sharedTasks.update(editingTask.id, taskForm);
      } else {
        resultTask = await api.sharedTasks.create(taskForm);
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
      setTaskError(null);
      await loadSharedData();

      // Trigger automatic WhatsApp alert prompt
      if (sendWhatsAppAlert) {
        const assignedMember = familyMembers.find((m) => m.full_name === taskForm.assigned_to_name);
        setWhatsAppModal({
          isOpen: true,
          taskTitle: taskForm.title,
          assignedToName: taskForm.assigned_to_name,
          assignedToPhone: assignedMember?.phone_number || resultTask?.whatsapp_notification?.target_phone || null,
          dueDate: taskForm.due_date,
          dueTime: taskForm.due_time,
          description: taskForm.description,
          createdByName: user?.full_name
        });
      }
    } catch (err: any) {
      setTaskError(err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleTaskStatus = async (task: SharedTask) => {
    const newStatus = task.status === 'pending' ? 'completed' : 'pending';
    try {
      // Optimistic update
      setTasksList((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
      await api.sharedTasks.toggleStatus(task.id, newStatus);
      loadSharedData();
    } catch (err: any) {
      console.error('Failed to toggle task status:', err);
      loadSharedData();
    }
  };

  const handleEditTask = (task: SharedTask) => {
    setEditingTask(task);
    setTaskError(null);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date || '',
      due_time: task.due_time || '',
      priority: task.priority,
      assigned_to_name: task.assigned_to_name,
      assigned_to_id: task.assigned_to_id || ''
    });
    setIsTaskModalOpen(true);
  };

  // --- Handlers: Family Plans ---
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanError(null);
    if (!planForm.title.trim() || !planForm.date) {
      setPlanError('Title and Date are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingPlan) {
        await api.familyPlans.update(editingPlan.id, planForm);
      } else {
        await api.familyPlans.create(planForm);
      }
      setIsPlanModalOpen(false);
      setEditingPlan(null);
      setPlanError(null);
      await loadSharedData();
    } catch (err: any) {
      setPlanError(err.message || 'Failed to save plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPlan = (plan: FamilyPlan) => {
    setEditingPlan(plan);
    setPlanError(null);
    setPlanForm({
      title: plan.title,
      description: plan.description || '',
      date: plan.date,
      time: plan.time || '',
      location: plan.location || ''
    });
    setIsPlanModalOpen(true);
  };

  // --- Handlers: Announcements ---
  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnError(null);
    if (!annForm.title.trim() || !annForm.content.trim()) {
      setAnnError('Title and Content are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAnn) {
        await api.announcements.update(editingAnn.id, annForm);
      } else {
        await api.announcements.create(annForm);
      }
      setIsAnnModalOpen(false);
      setEditingAnn(null);
      setAnnError(null);
      await loadSharedData();
    } catch (err: any) {
      setAnnError(err.message || 'Failed to post announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAnn = (ann: FamilyAnnouncement) => {
    setEditingAnn(ann);
    setAnnError(null);
    setAnnForm({
      title: ann.title,
      content: ann.content,
      tag: ann.tag,
      is_pinned: Boolean(ann.is_pinned)
    });
    setIsAnnModalOpen(true);
  };

  // --- Deletion Confirmation Execution ---
  const handleConfirmDelete = async () => {
    if (!deleteModal.id || !deleteModal.type) return;
    setIsDeleting(true);
    try {
      if (deleteModal.type === 'income') {
        await api.sharedIncome.delete(deleteModal.id);
      } else if (deleteModal.type === 'task') {
        await api.sharedTasks.delete(deleteModal.id);
      } else if (deleteModal.type === 'plan') {
        await api.familyPlans.delete(deleteModal.id);
      } else if (deleteModal.type === 'announcement') {
        await api.announcements.delete(deleteModal.id);
      }
      setDeleteModal({ isOpen: false, type: null, id: null, name: '' });
      await loadSharedData();
    } catch (err: any) {
      console.error('Failed to delete shared item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter tasks
  const filteredTasks = tasksList.filter((t) => {
    if (taskAssigneeFilter !== 'all') {
      if (taskAssigneeFilter === 'all_brothers') {
        if (t.assigned_to_name !== 'All Brothers') return false;
      } else {
        if (t.assigned_to_name !== taskAssigneeFilter) return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-emerald-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center shrink-0 border border-white/15">
              <Users className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-serif-title">Shared Family Space</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/20">
                  All 4 Brothers
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Collective revenue, joint tasks, gatherings, and family updates visible to all brothers.
              </p>
            </div>
          </div>

          {/* Sub-tab navigation pill buttons */}
          <div className="flex items-center p-1 bg-emerald-950/60 rounded-2xl border border-white/10 shrink-0 overflow-x-auto">
            <button
              onClick={() => setSubTab('income')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                subTab === 'income' ? 'bg-white text-emerald-950 shadow-xs' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Shared Income</span>
            </button>
            <button
              onClick={() => setSubTab('tasks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                subTab === 'tasks' ? 'bg-white text-emerald-950 shadow-xs' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Family Tasks</span>
            </button>
            <button
              onClick={() => setSubTab('plans')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                subTab === 'plans' ? 'bg-white text-emerald-950 shadow-xs' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Plans & Gatherings</span>
            </button>
            <button
              onClick={() => setSubTab('announcements')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all ${
                subTab === 'announcements' ? 'bg-white text-emerald-950 shadow-xs' : 'text-emerald-200 hover:text-white'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              <span>Announcements</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-3 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* ================================================================= */}
          {/* 1. SHARED FAMILY INCOME */}
          {/* ================================================================= */}
          {subTab === 'income' && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Total Shared Family Income
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Collective Fund
                    </span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 font-mono">
                    {incomeSummary?.currency || 'PKR'} {incomeSummary?.total?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Pooled revenue from family commercial properties, agriculture, and joint funds.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingIncome(null);
                    setIncomeForm({
                      title: '',
                      amount: '',
                      currency: 'PKR',
                      source_category: 'Family Property Rental',
                      date: new Date().toISOString().split('T')[0],
                      notes: ''
                    });
                    setIsIncomeModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record Shared Income</span>
                </button>
              </div>

              {/* Entries list */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Shared Income Ledger</h3>
                  <span className="text-xs text-slate-400">({incomeList.length} collective entries)</span>
                </div>

                {incomeList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No shared income recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {incomeList.map((entry) => (
                      <div
                        key={entry.id}
                        className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{entry.title}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800">
                              {entry.source_category}
                            </span>
                            {Boolean(entry.is_example) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700">
                                Example
                              </span>
                            )}
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-slate-600 leading-relaxed">{entry.notes}</p>
                          )}
                          <p className="text-[11px] text-slate-400">
                            Recorded by <strong className="text-slate-600">{entry.created_by_name}</strong> on {entry.date}
                            {entry.updated_by_name && entry.updated_by_name !== entry.created_by_name && (
                              <span> · Last updated by {entry.updated_by_name}</span>
                            )}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <span className="font-mono font-bold text-base text-emerald-700">
                            +{entry.currency} {entry.amount.toLocaleString()}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditIncome(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'income',
                                  id: entry.id,
                                  name: `${entry.title} (${entry.currency} ${entry.amount})`
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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
          {/* 2. SHARED FAMILY TASKS */}
          {/* ================================================================= */}
          {subTab === 'tasks' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Family Tasks & Responsibilities</h2>
                    <p className="text-xs text-slate-500">
                      Coordinated tasks across the four brothers with clear assignments.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={taskAssigneeFilter}
                      onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium bg-white focus:outline-none"
                    >
                      <option value="all">All Assignees</option>
                      <option value="all_brothers">Assigned to: All Brothers</option>
                      {familyMembers.map((m) => (
                        <option key={m.id} value={m.full_name}>
                          Assigned to: {m.full_name}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setTaskForm({
                          title: '',
                          description: '',
                          due_date: new Date().toISOString().split('T')[0],
                          due_time: '14:00',
                          priority: 'medium',
                          assigned_to_name: 'All Brothers',
                          assigned_to_id: ''
                        });
                        setIsTaskModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Family Task</span>
                    </button>
                  </div>
                </div>

                {filteredTasks.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No family tasks match the selected filter.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredTasks.map((t) => {
                      const isDone = t.status === 'completed';

                      return (
                        <div
                          key={t.id}
                          className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                            isDone
                              ? 'bg-slate-50/70 border-slate-200/60 opacity-75'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <button
                            onClick={() => handleToggleTaskStatus(t)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <div className="w-5 h-5 rounded-md border border-slate-300 hover:border-emerald-600 flex items-center justify-center"></div>
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

                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center gap-1">
                                <span>Assigned: {t.assigned_to_name}</span>
                                {t.assigned_to_phone && (
                                  <span className="text-[10px] text-emerald-600 font-mono">({t.assigned_to_phone})</span>
                                )}
                              </span>

                              {t.priority === 'high' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-50 text-rose-700">
                                  High Priority
                                </span>
                              )}

                              {Boolean(t.is_example) && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700">
                                  Example
                                </span>
                              )}
                            </div>

                            {t.description && (
                              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{t.description}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-2">
                              {t.due_date && (
                                <span className="flex items-center gap-1 text-slate-500">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Due: {t.due_date} {t.due_time || ''}</span>
                                </span>
                              )}
                              <span>Created by {t.created_by_name}</span>
                              {t.updated_by_name && t.updated_by_name !== t.created_by_name && (
                                <span>Updated by {t.updated_by_name}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setWhatsAppModal({
                                  isOpen: true,
                                  taskTitle: t.title,
                                  assignedToName: t.assigned_to_name,
                                  assignedToPhone: t.assigned_to_phone || null,
                                  dueDate: t.due_date,
                                  dueTime: t.due_time,
                                  description: t.description,
                                  createdByName: t.created_by_name
                                });
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                              title={`Notify ${t.assigned_to_name} on WhatsApp`}
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </button>

                            <button
                              onClick={() => handleEditTask(t)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
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
          {/* 3. FAMILY PLANS & GATHERINGS */}
          {/* ================================================================= */}
          {subTab === 'plans' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Family Plans & Gatherings</h2>
                    <p className="text-xs text-slate-500">
                      Coordinated schedules, dinners, Eid visits, and ancestral land checkups.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingPlan(null);
                      setPlanForm({
                        title: '',
                        description: '',
                        date: new Date().toISOString().split('T')[0],
                        time: '19:00',
                        location: ''
                      });
                      setIsPlanModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Gathering</span>
                  </button>
                </div>

                {plansList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No upcoming gatherings scheduled. Add a plan above!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plansList.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-5 rounded-2xl border border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900 font-serif-title">
                              {plan.title}
                            </span>
                            {Boolean(plan.is_example) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700">
                                Example
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold bg-emerald-50/70 p-2 rounded-xl">
                            <Calendar className="w-4 h-4 shrink-0 text-emerald-700" />
                            <span>{plan.date} {plan.time ? `at ${plan.time}` : ''}</span>
                          </div>

                          {plan.location && (
                            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-xl">
                              <span className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{plan.location}</span>
                              </span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(plan.location)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 shrink-0 ml-2"
                              >
                                <span>Map</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          )}

                          {plan.description && (
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {plan.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Created by {plan.created_by_name}</span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditPlan(plan)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'plan',
                                  id: plan.id,
                                  name: plan.title
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
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
          {/* 4. ANNOUNCEMENTS & UPDATES */}
          {/* ================================================================= */}
          {subTab === 'announcements' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Family Announcements & Board</h2>
                    <p className="text-xs text-slate-500">
                      Shared notice board for important updates and news for all 4 brothers.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingAnn(null);
                      setAnnForm({
                        title: '',
                        content: '',
                        tag: 'Family News',
                        is_pinned: false
                      });
                      setIsAnnModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Post Announcement</span>
                  </button>
                </div>

                {announcementsList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No announcements currently posted.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcementsList.map((ann) => (
                      <div
                        key={ann.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          Boolean(ann.is_pinned)
                            ? 'bg-emerald-50/40 border-emerald-200 shadow-xs ring-1 ring-emerald-500/10'
                            : 'bg-white border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {Boolean(ann.is_pinned) && (
                              <Pin className="w-4 h-4 text-emerald-700 shrink-0 rotate-45" />
                            )}
                            <h3 className="text-sm font-bold text-slate-900">{ann.title}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {ann.tag}
                            </span>
                            {Boolean(ann.is_example) && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700">
                                Example
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                          {ann.content}
                        </p>

                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Posted by <strong className="text-slate-600">{ann.created_by_name}</strong> on{' '}
                            {new Date(ann.created_at).toLocaleDateString()}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditAnn(ann)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  type: 'announcement',
                                  id: ann.id,
                                  name: ann.title
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
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

      {/* --- ADD / EDIT SHARED INCOME MODAL --- */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingIncome ? 'Edit Shared Income' : 'Record Shared Family Income'}
              </h3>
              <button onClick={() => setIsIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveIncome} className="p-6 space-y-4">
              {incomeError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{incomeError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commercial Plaza Rent (March 2026)"
                  value={incomeForm.title}
                  onChange={(e) => setIncomeForm({ ...incomeForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
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
                    value={incomeForm.amount}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
                  <input
                    type="text"
                    value={incomeForm.currency}
                    onChange={(e) => setIncomeForm({ ...incomeForm, currency: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Source Category</label>
                  <select
                    value={incomeForm.source_category}
                    onChange={(e) => setIncomeForm({ ...incomeForm, source_category: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {SHARED_INCOME_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date Received</label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Destination Account</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Deposited into joint family bank account..."
                  value={incomeForm.notes}
                  onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingIncome ? 'Update Record' : 'Save Shared Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT SHARED TASK MODAL --- */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingTask ? 'Edit Family Task' : 'New Shared Family Task'}
              </h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
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
                  placeholder="e.g. Review ancestral house renovation"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Assign To Brother</label>
                <select
                  value={taskForm.assigned_to_name}
                  onChange={(e) => {
                    const chosen = e.target.value;
                    const found = familyMembers.find((m) => m.full_name === chosen);
                    setTaskForm({
                      ...taskForm,
                      assigned_to_name: chosen,
                      assigned_to_id: found ? found.id : ''
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="All Brothers">All Brothers (Sends alert options to everyone)</option>
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.full_name}>
                      {m.full_name} {m.phone_number ? `(${m.phone_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Details (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or expectations..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
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

              {/* Automatic WhatsApp Alert Checkbox */}
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-emerald-950">
                  <input
                    type="checkbox"
                    checked={sendWhatsAppAlert}
                    onChange={(e) => setSendWhatsAppAlert(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                  />
                  <span>Send automatic WhatsApp alert to assigned brother</span>
                </label>
                <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingTask ? 'Update Task' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT PLAN MODAL --- */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingPlan ? 'Edit Family Plan' : 'Schedule Family Plan / Gathering'}
              </h3>
              <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              {planError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{planError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Plan Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Family Dinner & Meeting"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={planForm.date}
                    onChange={(e) => setPlanForm({ ...planForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Time</label>
                  <input
                    type="time"
                    value={planForm.time}
                    onChange={(e) => setPlanForm({ ...planForm, time: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Location / Venue (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Family Residence, Hayatabad, Peshawar"
                  value={planForm.location}
                  onChange={(e) => setPlanForm({ ...planForm, location: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Agenda / Details</label>
                <textarea
                  rows={3}
                  placeholder="Items to discuss, dinner arrangements..."
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingPlan ? 'Update Plan' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD / EDIT ANNOUNCEMENT MODAL --- */}
      {isAnnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-base font-bold text-slate-900">
                {editingAnn ? 'Edit Announcement' : 'Post Family Announcement'}
              </h3>
              <button onClick={() => setIsAnnModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSaveAnnouncement} className="p-6 space-y-4">
              {annError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{annError}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Announcement headline..."
                  value={annForm.title}
                  onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Message Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write message for the four brothers..."
                  value={annForm.content}
                  onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category Tag</label>
                  <input
                    type="text"
                    value={annForm.tag}
                    onChange={(e) => setAnnForm({ ...annForm, tag: e.target.value })}
                    placeholder="News, Urgent, Event, Finance..."
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                  />
                </div>
                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={annForm.is_pinned}
                      onChange={(e) => setAnnForm({ ...annForm, is_pinned: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
                    />
                    <span>Pin to Notice Board</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAnnModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingAnn ? 'Update Announcement' : 'Post Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL --- */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Shared Family Record?"
        message="Are you sure you want to remove this record from the shared space? All four brothers will no longer see it."
        itemName={deleteModal.name}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModal({ isOpen: false, type: null, id: null, name: '' })}
      />

      {/* --- WHATSAPP TASK ALERT MODAL --- */}
      <WhatsAppAlertModal
        isOpen={whatsAppModal.isOpen}
        onClose={() => setWhatsAppModal({ ...whatsAppModal, isOpen: false })}
        taskTitle={whatsAppModal.taskTitle}
        assignedToName={whatsAppModal.assignedToName}
        assignedToPhone={whatsAppModal.assignedToPhone}
        dueDate={whatsAppModal.dueDate}
        dueTime={whatsAppModal.dueTime}
        description={whatsAppModal.description}
        createdByName={whatsAppModal.createdByName}
      />
    </div>
  );
};
