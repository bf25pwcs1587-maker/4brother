import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase.ts';
import {
  Brother,
  PrivateNote,
  PersonalTransaction,
  PrivateTask,
  SharedIncome,
  SharedTask,
  FamilyPlan,
  FamilyAnnouncement
} from '../types/index.ts';
import { INITIAL_BROTHERS } from './storage.ts';

// Collections
const USERS_COL = 'users';
const SHARED_INCOME_COL = 'shared_income';
const SHARED_TASKS_COL = 'shared_tasks';
const FAMILY_PLANS_COL = 'family_plans';
const ANNOUNCEMENTS_COL = 'family_announcements';

export const cloudDb = {
  // --- BROTHERS & PROFILES ---
  initBrothersIfEmpty: async (): Promise<Brother[]> => {
    try {
      const snap = await getDocs(collection(db, USERS_COL));
      if (!snap.empty) {
        const list: Brother[] = [];
        snap.forEach((d) => list.push(d.data() as Brother));
        // Sort in standard order: mahmood, azhar, talha, sabaz
        const order = ['mahmood', 'azhar', 'talha', 'sabaz'];
        return list.sort((a, b) => order.indexOf(a.brother_key) - order.indexOf(b.brother_key));
      }

      // Initialize initial 4 brothers
      for (const b of INITIAL_BROTHERS) {
        await setDoc(doc(db, USERS_COL, b.id), b, { merge: true });
      }
      return INITIAL_BROTHERS;
    } catch (err) {
      console.error('[CloudDb] initBrothers error:', err);
      return INITIAL_BROTHERS;
    }
  },

  getBrothers: async (): Promise<Brother[]> => {
    try {
      const snap = await getDocs(collection(db, USERS_COL));
      if (snap.empty) {
        return await cloudDb.initBrothersIfEmpty();
      }
      const list: Brother[] = [];
      snap.forEach((d) => list.push(d.data() as Brother));
      const order = ['mahmood', 'azhar', 'talha', 'sabaz'];
      return list.sort((a, b) => order.indexOf(a.brother_key) - order.indexOf(b.brother_key));
    } catch (err) {
      console.warn('[CloudDb] getBrothers fallback:', err);
      return INITIAL_BROTHERS;
    }
  },

  updateBrotherProfile: async (
    userId: string,
    updates: Partial<Brother>
  ): Promise<Brother> => {
    const userRef = doc(db, USERS_COL, userId);
    const existingSnap = await getDoc(userRef);
    const existing = existingSnap.exists()
      ? (existingSnap.data() as Brother)
      : INITIAL_BROTHERS.find((b) => b.id === userId) || INITIAL_BROTHERS[0];

    const updated: Brother = {
      ...existing,
      ...updates,
      id: userId
    };

    await setDoc(userRef, updated, { merge: true });
    return updated;
  },

  subscribeBrothers: (callback: (brothers: Brother[]) => void): Unsubscribe => {
    return onSnapshot(collection(db, USERS_COL), (snap) => {
      if (!snap.empty) {
        const list: Brother[] = [];
        snap.forEach((d) => list.push(d.data() as Brother));
        const order = ['mahmood', 'azhar', 'talha', 'sabaz'];
        list.sort((a, b) => order.indexOf(a.brother_key) - order.indexOf(b.brother_key));
        callback(list);
      }
    });
  },

  // --- PRIVATE NOTES (Scoped to userId) ---
  getPrivateNotes: async (userId: string): Promise<PrivateNote[]> => {
    try {
      const colRef = collection(db, USERS_COL, userId, 'private_notes');
      const snap = await getDocs(colRef);
      const list: PrivateNote[] = [];
      snap.forEach((d) => list.push(d.data() as PrivateNote));
      return list.sort((a, b) => {
        if (Number(b.is_pinned) !== Number(a.is_pinned)) {
          return Number(b.is_pinned) - Number(a.is_pinned);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (err) {
      console.warn('[CloudDb] getPrivateNotes error:', err);
      return [];
    }
  },

  savePrivateNote: async (userId: string, note: PrivateNote): Promise<PrivateNote> => {
    const docRef = doc(db, USERS_COL, userId, 'private_notes', note.id);
    await setDoc(docRef, note, { merge: true });
    return note;
  },

  deletePrivateNote: async (userId: string, noteId: string): Promise<boolean> => {
    const docRef = doc(db, USERS_COL, userId, 'private_notes', noteId);
    await deleteDoc(docRef);
    return true;
  },

  // --- PERSONAL TRANSACTIONS (Scoped to userId) ---
  getPersonalTransactions: async (userId: string): Promise<PersonalTransaction[]> => {
    try {
      const colRef = collection(db, USERS_COL, userId, 'personal_transactions');
      const snap = await getDocs(colRef);
      const list: PersonalTransaction[] = [];
      snap.forEach((d) => list.push(d.data() as PersonalTransaction));
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (err) {
      console.warn('[CloudDb] getPersonalTransactions error:', err);
      return [];
    }
  },

  savePersonalTransaction: async (
    userId: string,
    tx: PersonalTransaction
  ): Promise<PersonalTransaction> => {
    const docRef = doc(db, USERS_COL, userId, 'personal_transactions', tx.id);
    await setDoc(docRef, tx, { merge: true });
    return tx;
  },

  deletePersonalTransaction: async (userId: string, txId: string): Promise<boolean> => {
    const docRef = doc(db, USERS_COL, userId, 'personal_transactions', txId);
    await deleteDoc(docRef);
    return true;
  },

  // --- PRIVATE TASKS (Scoped to userId) ---
  getPrivateTasks: async (userId: string): Promise<PrivateTask[]> => {
    try {
      const colRef = collection(db, USERS_COL, userId, 'private_tasks');
      const snap = await getDocs(colRef);
      const list: PrivateTask[] = [];
      snap.forEach((d) => list.push(d.data() as PrivateTask));
      return list.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (err) {
      console.warn('[CloudDb] getPrivateTasks error:', err);
      return [];
    }
  },

  savePrivateTask: async (userId: string, task: PrivateTask): Promise<PrivateTask> => {
    const docRef = doc(db, USERS_COL, userId, 'private_tasks', task.id);
    await setDoc(docRef, task, { merge: true });
    return task;
  },

  deletePrivateTask: async (userId: string, taskId: string): Promise<boolean> => {
    const docRef = doc(db, USERS_COL, userId, 'private_tasks', taskId);
    await deleteDoc(docRef);
    return true;
  },

  // --- SHARED INCOME ---
  getSharedIncome: async (): Promise<SharedIncome[]> => {
    try {
      const snap = await getDocs(collection(db, SHARED_INCOME_COL));
      const list: SharedIncome[] = [];
      snap.forEach((d) => list.push(d.data() as SharedIncome));
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (err) {
      console.warn('[CloudDb] getSharedIncome error:', err);
      return [];
    }
  },

  saveSharedIncome: async (inc: SharedIncome): Promise<SharedIncome> => {
    const docRef = doc(db, SHARED_INCOME_COL, inc.id);
    await setDoc(docRef, inc, { merge: true });
    return inc;
  },

  deleteSharedIncome: async (id: string): Promise<boolean> => {
    await deleteDoc(doc(db, SHARED_INCOME_COL, id));
    return true;
  },

  // --- SHARED TASKS ---
  getSharedTasks: async (): Promise<SharedTask[]> => {
    try {
      const snap = await getDocs(collection(db, SHARED_TASKS_COL));
      const list: SharedTask[] = [];
      snap.forEach((d) => list.push(d.data() as SharedTask));
      return list.sort((a, b) => {
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (err) {
      console.warn('[CloudDb] getSharedTasks error:', err);
      return [];
    }
  },

  saveSharedTask: async (task: SharedTask): Promise<SharedTask> => {
    const docRef = doc(db, SHARED_TASKS_COL, task.id);
    await setDoc(docRef, task, { merge: true });
    return task;
  },

  deleteSharedTask: async (id: string): Promise<boolean> => {
    await deleteDoc(doc(db, SHARED_TASKS_COL, id));
    return true;
  },

  // --- FAMILY PLANS ---
  getFamilyPlans: async (): Promise<FamilyPlan[]> => {
    try {
      const snap = await getDocs(collection(db, FAMILY_PLANS_COL));
      const list: FamilyPlan[] = [];
      snap.forEach((d) => list.push(d.data() as FamilyPlan));
      return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (err) {
      console.warn('[CloudDb] getFamilyPlans error:', err);
      return [];
    }
  },

  saveFamilyPlan: async (plan: FamilyPlan): Promise<FamilyPlan> => {
    const docRef = doc(db, FAMILY_PLANS_COL, plan.id);
    await setDoc(docRef, plan, { merge: true });
    return plan;
  },

  deleteFamilyPlan: async (id: string): Promise<boolean> => {
    await deleteDoc(doc(db, FAMILY_PLANS_COL, id));
    return true;
  },

  // --- FAMILY ANNOUNCEMENTS ---
  getFamilyAnnouncements: async (): Promise<FamilyAnnouncement[]> => {
    try {
      const snap = await getDocs(collection(db, ANNOUNCEMENTS_COL));
      const list: FamilyAnnouncement[] = [];
      snap.forEach((d) => list.push(d.data() as FamilyAnnouncement));
      return list.sort((a, b) => {
        if (Number(b.is_pinned) !== Number(a.is_pinned)) {
          return Number(b.is_pinned) - Number(a.is_pinned);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (err) {
      console.warn('[CloudDb] getFamilyAnnouncements error:', err);
      return [];
    }
  },

  saveFamilyAnnouncement: async (
    ann: FamilyAnnouncement
  ): Promise<FamilyAnnouncement> => {
    const docRef = doc(db, ANNOUNCEMENTS_COL, ann.id);
    await setDoc(docRef, ann, { merge: true });
    return ann;
  },

  deleteFamilyAnnouncement: async (id: string): Promise<boolean> => {
    await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
    return true;
  }
};
