import express, { type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword, clearExampleData, seedExamples, BROTHERS_CONFIG } from './db.ts';
import { requireAuth, createSession, deleteSession, type AuthRequest } from './auth.ts';

export const apiRouter = express.Router();

// ============================================================================
// 1. AUTHENTICATION & BROTHER ACCOUNTS
// ============================================================================

// List the 4 brother profiles (for selector & assignments)
apiRouter.get('/family/members', (req: Request, res: Response) => {
  try {
    const members = db.prepare(`
      SELECT id, full_name, brother_key, avatar_color, avatar_url, phone_number, email, role
      FROM users
      ORDER BY full_name ASC
    `).all();
    res.json(members);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve family members', details: error.message });
  }
});

// Secure Login (by email or brother key, plus password)
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { emailOrKey, password } = req.body;
    if (!emailOrKey || !password) {
      return res.status(400).json({ error: 'Please enter your account username/email and password.' });
    }

    const trimmed = String(emailOrKey).trim().toLowerCase();
    const user = db.prepare(`
      SELECT * FROM users
      WHERE LOWER(email) = ? OR LOWER(brother_key) = ?
    `).get(trimmed, trimmed) as any;

    if (!user) {
      return res.status(401).json({
        error: 'Account not found. Please select one of the four brother accounts.'
      });
    }

    const hashedInput = hashPassword(String(password).trim());
    if (user.password_hash !== hashedInput) {
      return res.status(401).json({
        error: 'Incorrect passcode/password. Please verify your login credentials.'
      });
    }

    const session = createSession(user.id);
    res.json({
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        brother_key: user.brother_key,
        avatar_color: user.avatar_color,
        avatar_url: user.avatar_url || null,
        phone_number: user.phone_number || null,
        role: user.role
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Login service error', details: error.message });
  }
});

// Update Profile (Email, Avatar Picture, Phone / WhatsApp, Name)
apiRouter.put('/auth/profile', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { email, avatar_url, phone_number, full_name } = req.body;
    const userId = req.user!.id;
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!existing) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const updatedEmail = email && String(email).trim() ? String(email).trim().toLowerCase() : existing.email;
    const updatedName = full_name && String(full_name).trim() ? String(full_name).trim() : existing.full_name;
    const updatedPhone = phone_number !== undefined ? String(phone_number).trim() : existing.phone_number;
    const updatedAvatar = avatar_url !== undefined ? avatar_url : existing.avatar_url;

    // Check if new email is already taken by another brother
    if (updatedEmail !== existing.email) {
      const emailClash = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(updatedEmail, userId);
      if (emailClash) {
        return res.status(400).json({ error: 'This email is already associated with another brother account.' });
      }
    }

    db.prepare(`
      UPDATE users
      SET email = ?, full_name = ?, phone_number = ?, avatar_url = ?, updated_at = ?
      WHERE id = ?
    `).run(updatedEmail, updatedName, updatedPhone, updatedAvatar, now, userId);

    try {
      db.prepare(`
        UPDATE shared_tasks
        SET assigned_to_avatar = ?, assigned_to_name = ?
        WHERE assigned_to_id = ?
      `).run(updatedAvatar, updatedName, userId);
    } catch {}

    const updatedUser = db.prepare(`
      SELECT id, email, full_name, brother_key, avatar_color, avatar_url, phone_number, role
      FROM users WHERE id = ?
    `).get(userId);

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Current Authenticated Session
apiRouter.get('/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Logout
apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();
    deleteSession(token);
  }
  res.json({ success: true, message: 'Signed out successfully.' });
});

// Change Password for Logged-In Brother
apiRouter.post('/auth/change-password', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current password and new password are required.' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user!.id) as any;
    if (!user || user.password_hash !== hashPassword(currentPassword.trim())) {
      return res.status(403).json({ error: 'Current password is incorrect.' });
    }

    const updatedNow = new Date().toISOString();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hashPassword(newPassword.trim()), updatedNow, req.user!.id);

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update password', details: error.message });
  }
});


// ============================================================================
// 2. PRIVATE NOTES (STRICT USER-ID ISOLATION)
// ============================================================================

apiRouter.get('/private/notes', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const notes = db.prepare(`
      SELECT * FROM private_notes
      WHERE user_id = ?
      ORDER BY is_pinned DESC, updated_at DESC
    `).all(req.user!.id);
    res.json(notes);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load private notes', details: error.message });
  }
});

apiRouter.post('/private/notes', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { title, content, category, is_pinned } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO private_notes (id, user_id, title, content, category, is_pinned, is_example, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      req.user!.id,
      title.trim(),
      content ? content.trim() : '',
      category ? category.trim() : 'General',
      is_pinned ? 1 : 0,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM private_notes WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create private note', details: error.message });
  }
});

apiRouter.put('/private/notes/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, category, is_pinned } = req.body;

    // Strict privacy ownership check
    const existing = db.prepare('SELECT * FROM private_notes WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    if (existing.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized: You cannot access or modify another brother’s private note.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Note title is required.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE private_notes
      SET title = ?, content = ?, category = ?, is_pinned = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title.trim(),
      content ? content.trim() : '',
      category ? category.trim() : 'General',
      is_pinned ? 1 : 0,
      now,
      id,
      req.user!.id
    );

    const updated = db.prepare('SELECT * FROM private_notes WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update note', details: error.message });
  }
});

apiRouter.delete('/private/notes/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Strict privacy ownership check
    const existing = db.prepare('SELECT * FROM private_notes WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Note not found.' });
    }
    if (existing.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized: You cannot delete another brother’s private note.' });
    }

    db.prepare('DELETE FROM private_notes WHERE id = ? AND user_id = ?').run(id, req.user!.id);
    res.json({ success: true, message: 'Private note deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete note', details: error.message });
  }
});


// ============================================================================
// 3. PRIVATE MONEY TRACKER (INCOME & EXPENSES)
// ============================================================================

apiRouter.get('/private/money', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const transactions = db.prepare(`
      SELECT * FROM personal_transactions
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
    `).all(req.user!.id);
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve transactions', details: error.message });
  }
});

apiRouter.get('/private/money/summary', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const rows = db.prepare(`
      SELECT type, SUM(amount) as total
      FROM personal_transactions
      WHERE user_id = ?
      GROUP BY type
    `).all(req.user!.id) as Array<{ type: string; total: number }>;

    let totalIncome = 0;
    let totalExpense = 0;

    for (const r of rows) {
      if (r.type === 'income') totalIncome = r.total || 0;
      if (r.type === 'expense') totalExpense = r.total || 0;
    }

    const netBalance = totalIncome - totalExpense;

    // Breakdown by category
    const categoryBreakdown = db.prepare(`
      SELECT category, type, SUM(amount) as total, COUNT(*) as count
      FROM personal_transactions
      WHERE user_id = ?
      GROUP BY category, type
      ORDER BY total DESC
    `).all(req.user!.id);

    res.json({
      totalIncome,
      totalExpense,
      netBalance,
      currency: 'PKR',
      categoryBreakdown
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to compute money summary', details: error.message });
  }
});

apiRouter.post('/private/money', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { type, amount, currency, description, category, date } = req.body;

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Transaction type must be "income" or "expense".' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive amount.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Transaction description is required.' });
    }
    if (!category || !category.trim()) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const txDate = date ? String(date).trim() : now.split('T')[0];

    db.prepare(`
      INSERT INTO personal_transactions (id, user_id, type, amount, currency, description, category, date, is_example, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      req.user!.id,
      type,
      parsedAmount,
      currency ? currency.trim().toUpperCase() : 'PKR',
      description.trim(),
      category.trim(),
      txDate,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM personal_transactions WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record transaction', details: error.message });
  }
});

apiRouter.put('/private/money/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { type, amount, currency, description, category, date } = req.body;

    const existing = db.prepare('SELECT * FROM personal_transactions WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Transaction record not found.' });
    }
    if (existing.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized: You cannot modify another brother’s private financial transaction.' });
    }

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ error: 'Transaction type must be "income" or "expense".' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE personal_transactions
      SET type = ?, amount = ?, currency = ?, description = ?, category = ?, date = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      type,
      parsedAmount,
      currency ? currency.trim().toUpperCase() : 'PKR',
      description.trim(),
      category ? category.trim() : existing.category,
      date ? String(date).trim() : existing.date,
      now,
      id,
      req.user!.id
    );

    const updated = db.prepare('SELECT * FROM personal_transactions WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update transaction', details: error.message });
  }
});

apiRouter.delete('/private/money/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM personal_transactions WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found.' });
    }
    if (existing.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized: You cannot delete another brother’s private transaction.' });
    }

    db.prepare('DELETE FROM personal_transactions WHERE id = ? AND user_id = ?').run(id, req.user!.id);
    res.json({ success: true, message: 'Transaction deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete transaction', details: error.message });
  }
});


// ============================================================================
// 4. PRIVATE TASKS (STRICT USER-ID ISOLATION)
// ============================================================================

apiRouter.get('/private/tasks', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const tasks = db.prepare(`
      SELECT * FROM private_tasks
      WHERE user_id = ?
      ORDER BY
        CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
        due_date ASC,
        due_time ASC
    `).all(req.user!.id);
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load private tasks', details: error.message });
  }
});

apiRouter.post('/private/tasks', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { title, description, due_date, due_time, priority, category } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO private_tasks (id, user_id, title, description, due_date, due_time, priority, status, category, is_example, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 0, ?, ?)
    `).run(
      id,
      req.user!.id,
      title.trim(),
      description ? description.trim() : '',
      due_date ? String(due_date).trim() : null,
      due_time ? String(due_time).trim() : '',
      priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      category ? category.trim() : 'Personal',
      now,
      now
    );

    const created = db.prepare('SELECT * FROM private_tasks WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
});

apiRouter.patch('/private/tasks/:id/status', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "pending" or "completed".' });
    }

    const existing = db.prepare('SELECT * FROM private_tasks WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    if (existing.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized: You cannot update another brother’s private task.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE private_tasks SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?')
      .run(status, now, id, req.user!.id);

    const updated = db.prepare('SELECT * FROM private_tasks WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle status', details: error.message });
  }
});

apiRouter.put('/private/tasks/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, due_time, priority, category, status } = req.body;

    const existing = db.prepare('SELECT * FROM private_tasks WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    if (existing.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized: You cannot modify another brother’s private task.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE private_tasks
      SET title = ?, description = ?, due_date = ?, due_time = ?, priority = ?, category = ?, status = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).run(
      title.trim(),
      description ? description.trim() : '',
      due_date ? String(due_date).trim() : null,
      due_time ? String(due_time).trim() : '',
      priority && ['low', 'medium', 'high'].includes(priority) ? priority : existing.priority,
      category ? category.trim() : existing.category,
      status && ['pending', 'completed'].includes(status) ? status : existing.status,
      now,
      id,
      req.user!.id
    );

    const updated = db.prepare('SELECT * FROM private_tasks WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update task', details: error.message });
  }
});

apiRouter.delete('/private/tasks/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM private_tasks WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    if (existing.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized: You cannot delete another brother’s task.' });
    }

    db.prepare('DELETE FROM private_tasks WHERE id = ? AND user_id = ?').run(id, req.user!.id);
    res.json({ success: true, message: 'Private task deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete task', details: error.message });
  }
});


// ============================================================================
// 5. SHARED FAMILY INCOME (SHARED SPACE - ALL 4 BROTHERS)
// ============================================================================

apiRouter.get('/shared/income', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const records = db.prepare(`
      SELECT * FROM shared_income
      ORDER BY date DESC, created_at DESC
    `).all();
    res.json(records);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load shared income records', details: error.message });
  }
});

apiRouter.get('/shared/income/summary', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const totalRow = db.prepare('SELECT SUM(amount) as total, COUNT(*) as count FROM shared_income').get() as any;
    const categories = db.prepare(`
      SELECT source_category, SUM(amount) as total, COUNT(*) as count
      FROM shared_income
      GROUP BY source_category
      ORDER BY total DESC
    `).all();

    res.json({
      total: totalRow?.total || 0,
      count: totalRow?.count || 0,
      currency: 'PKR',
      categories
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load shared income summary', details: error.message });
  }
});

apiRouter.post('/shared/income', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { title, amount, currency, source_category, date, notes } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Income title is required.' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valid positive amount is required.' });
    }
    if (!source_category || !source_category.trim()) {
      return res.status(400).json({ error: 'Source category is required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const recordDate = date ? String(date).trim() : now.split('T')[0];

    db.prepare(`
      INSERT INTO shared_income (id, title, amount, currency, source_category, date, notes, created_by_id, created_by_name, updated_by_name, is_example, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      title.trim(),
      parsedAmount,
      currency ? currency.trim().toUpperCase() : 'PKR',
      source_category.trim(),
      recordDate,
      notes ? notes.trim() : '',
      req.user!.id,
      req.user!.full_name,
      req.user!.full_name,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM shared_income WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record shared income', details: error.message });
  }
});

apiRouter.put('/shared/income/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, amount, currency, source_category, date, notes } = req.body;

    const existing = db.prepare('SELECT * FROM shared_income WHERE id = ?').get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: 'Shared income record not found.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than zero.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE shared_income
      SET title = ?, amount = ?, currency = ?, source_category = ?, date = ?, notes = ?, updated_by_name = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title.trim(),
      parsedAmount,
      currency ? currency.trim().toUpperCase() : 'PKR',
      source_category ? source_category.trim() : existing.source_category,
      date ? String(date).trim() : existing.date,
      notes ? notes.trim() : '',
      req.user!.full_name,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM shared_income WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update shared income record', details: error.message });
  }
});

apiRouter.delete('/shared/income/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM shared_income WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Shared income record not found.' });
    }

    db.prepare('DELETE FROM shared_income WHERE id = ?').run(id);
    res.json({ success: true, message: 'Shared income entry deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete record', details: error.message });
  }
});


// ============================================================================
// 6. SHARED FAMILY TASKS
// ============================================================================

apiRouter.get('/shared/tasks', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const tasks = db.prepare(`
      SELECT st.*, u.phone_number as assigned_to_phone, u.avatar_url as assigned_to_avatar
      FROM shared_tasks st
      LEFT JOIN users u ON (st.assigned_to_id = u.id OR st.assigned_to_name = u.full_name)
      ORDER BY
        CASE WHEN st.status = 'pending' THEN 0 ELSE 1 END,
        st.due_date ASC,
        st.due_time ASC
    `).all();
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load shared tasks', details: error.message });
  }
});

apiRouter.post('/shared/tasks', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { title, description, due_date, due_time, priority, assigned_to_name, assigned_to_id } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const assignedName = assigned_to_name ? assigned_to_name.trim() : 'All Brothers';

    db.prepare(`
      INSERT INTO shared_tasks (id, title, description, due_date, due_time, priority, assigned_to_name, assigned_to_id, status, created_by_id, created_by_name, updated_by_name, is_example, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      title.trim(),
      description ? description.trim() : '',
      due_date ? String(due_date).trim() : null,
      due_time ? String(due_time).trim() : '',
      priority && ['low', 'medium', 'high'].includes(priority) ? priority : 'medium',
      assignedName,
      assigned_to_id || null,
      req.user!.id,
      req.user!.full_name,
      req.user!.full_name,
      now,
      now
    );

    const created = db.prepare(`
      SELECT st.*, u.phone_number as assigned_to_phone, u.avatar_url as assigned_to_avatar
      FROM shared_tasks st
      LEFT JOIN users u ON (st.assigned_to_id = u.id OR st.assigned_to_name = u.full_name)
      WHERE st.id = ?
    `).get(id) as any;

    // Look up target brother's phone number for automatic WhatsApp notification
    let targetPhone = created.assigned_to_phone;
    if (!targetPhone && assignedName !== 'All Brothers') {
      const u = db.prepare('SELECT phone_number FROM users WHERE full_name = ?').get(assignedName) as any;
      targetPhone = u?.phone_number || null;
    }

    const waText = `Assalamu Alaikum ${assignedName}!\nYou have been assigned a task on 4 Brothers:\n📋 Task: ${title.trim()}\n${due_date ? `📅 Due Date: ${due_date} ${due_time || ''}\n` : ''}👤 Assigned by: ${req.user!.full_name}\n${description ? `📝 Details: ${description.trim()}\n` : ''}Check it on 4 Brothers Family Hub.`;

    res.status(201).json({
      ...created,
      whatsapp_notification: {
        target_phone: targetPhone,
        recipient_name: assignedName,
        message: waText
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create shared task', details: error.message });
  }
});

apiRouter.patch('/shared/tasks/:id/status', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'completed'].includes(status)) {
      return res.status(400).json({ error: 'Status must be "pending" or "completed".' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE shared_tasks SET status = ?, updated_by_name = ?, updated_at = ? WHERE id = ?')
      .run(status, req.user!.full_name, now, id);

    const updated = db.prepare('SELECT * FROM shared_tasks WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update shared task status', details: error.message });
  }
});

apiRouter.put('/shared/tasks/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, due_time, priority, assigned_to_name, assigned_to_id, status } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE shared_tasks
      SET title = ?, description = ?, due_date = ?, due_time = ?, priority = ?, assigned_to_name = ?, assigned_to_id = ?, status = ?, updated_by_name = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title.trim(),
      description ? description.trim() : '',
      due_date ? String(due_date).trim() : null,
      due_time ? String(due_time).trim() : '',
      priority || 'medium',
      assigned_to_name ? assigned_to_name.trim() : 'All Brothers',
      assigned_to_id || null,
      status || 'pending',
      req.user!.full_name,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM shared_tasks WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update shared task', details: error.message });
  }
});

apiRouter.delete('/shared/tasks/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM shared_tasks WHERE id = ?').run(id);
    res.json({ success: true, message: 'Shared task deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete shared task', details: error.message });
  }
});


// ============================================================================
// 7. FAMILY PLANS & GATHERINGS
// ============================================================================

apiRouter.get('/shared/plans', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const plans = db.prepare(`
      SELECT * FROM family_plans
      ORDER BY date ASC, time ASC
    `).all();
    res.json(plans);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load family plans', details: error.message });
  }
});

apiRouter.post('/shared/plans', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { title, description, date, time, location } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Plan title is required.' });
    }
    if (!date || !date.trim()) {
      return res.status(400).json({ error: 'Plan date is required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO family_plans (id, title, description, date, time, location, created_by_id, created_by_name, updated_by_name, is_example, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      title.trim(),
      description ? description.trim() : '',
      date.trim(),
      time ? time.trim() : '',
      location ? location.trim() : '',
      req.user!.id,
      req.user!.full_name,
      req.user!.full_name,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM family_plans WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create plan', details: error.message });
  }
});

apiRouter.put('/shared/plans/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, date, time, location } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (!date || !date.trim()) {
      return res.status(400).json({ error: 'Date is required.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE family_plans
      SET title = ?, description = ?, date = ?, time = ?, location = ?, updated_by_name = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title.trim(),
      description ? description.trim() : '',
      date.trim(),
      time ? time.trim() : '',
      location ? location.trim() : '',
      req.user!.full_name,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM family_plans WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update plan', details: error.message });
  }
});

apiRouter.delete('/shared/plans/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM family_plans WHERE id = ?').run(id);
    res.json({ success: true, message: 'Plan deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete plan', details: error.message });
  }
});


// ============================================================================
// 8. FAMILY ANNOUNCEMENTS & UPDATES
// ============================================================================

apiRouter.get('/shared/announcements', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const updates = db.prepare(`
      SELECT * FROM family_announcements
      ORDER BY is_pinned DESC, created_at DESC
    `).all();
    res.json(updates);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load announcements', details: error.message });
  }
});

apiRouter.post('/shared/announcements', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { title, content, tag, is_pinned } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Announcement title is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required.' });
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO family_announcements (id, title, content, tag, is_pinned, created_by_id, created_by_name, updated_by_name, is_example, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      id,
      title.trim(),
      content.trim(),
      tag ? tag.trim() : 'Family News',
      is_pinned ? 1 : 0,
      req.user!.id,
      req.user!.full_name,
      req.user!.full_name,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM family_announcements WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to post announcement', details: error.message });
  }
});

apiRouter.put('/shared/announcements/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, tag, is_pinned } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required.' });
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE family_announcements
      SET title = ?, content = ?, tag = ?, is_pinned = ?, updated_by_name = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title.trim(),
      content.trim(),
      tag ? tag.trim() : 'Family News',
      is_pinned ? 1 : 0,
      req.user!.full_name,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM family_announcements WHERE id = ?').get(id);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update announcement', details: error.message });
  }
});

apiRouter.delete('/shared/announcements/:id', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM family_announcements WHERE id = ?').run(id);
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete announcement', details: error.message });
  }
});


// ============================================================================
// 9. UNIFIED DASHBOARD OVERVIEW
// ============================================================================

apiRouter.get('/dashboard/overview', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Personal Money totals
    const moneyRows = db.prepare(`
      SELECT type, SUM(amount) as total
      FROM personal_transactions
      WHERE user_id = ?
      GROUP BY type
    `).all(userId) as Array<{ type: string; total: number }>;

    let personalIncome = 0;
    let personalExpense = 0;
    for (const r of moneyRows) {
      if (r.type === 'income') personalIncome = r.total || 0;
      if (r.type === 'expense') personalExpense = r.total || 0;
    }

    // Recent 4 personal transactions
    const recentTransactions = db.prepare(`
      SELECT * FROM personal_transactions
      WHERE user_id = ?
      ORDER BY date DESC, created_at DESC
      LIMIT 4
    `).all(userId);

    // Upcoming private tasks (pending)
    const upcomingPrivateTasks = db.prepare(`
      SELECT * FROM private_tasks
      WHERE user_id = ? AND status = 'pending'
      ORDER BY due_date ASC, due_time ASC
      LIMIT 4
    `).all(userId);

    // Private notes count
    const privateNotesCount = (db.prepare('SELECT COUNT(*) as count FROM private_notes WHERE user_id = ?').get(userId) as any)?.count || 0;

    // Shared family income total
    const sharedIncomeTotal = (db.prepare('SELECT SUM(amount) as total FROM shared_income').get() as any)?.total || 0;

    // Upcoming shared tasks
    const upcomingSharedTasks = db.prepare(`
      SELECT * FROM shared_tasks
      WHERE status = 'pending'
      ORDER BY due_date ASC, due_time ASC
      LIMIT 4
    `).all();

    // Next family plans
    const upcomingPlans = db.prepare(`
      SELECT * FROM family_plans
      ORDER BY date ASC, time ASC
      LIMIT 3
    `).all();

    // Latest Announcements
    const recentAnnouncements = db.prepare(`
      SELECT * FROM family_announcements
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT 4
    `).all();

    res.json({
      brother: req.user,
      personalFinance: {
        totalIncome: personalIncome,
        totalExpense: personalExpense,
        netBalance: personalIncome - personalExpense,
        currency: 'PKR',
        recentTransactions
      },
      upcomingPrivateTasks,
      privateNotesCount,
      sharedFinance: {
        totalSharedIncome: sharedIncomeTotal,
        currency: 'PKR'
      },
      upcomingSharedTasks,
      upcomingPlans,
      recentAnnouncements
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to load dashboard overview', details: error.message });
  }
});


// ============================================================================
// 10. ADMIN & EXAMPLE DATA MANAGEMENT
// ============================================================================

apiRouter.post('/admin/clear-examples', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    clearExampleData();
    res.json({ success: true, message: 'All sample records successfully removed.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to clear sample records', details: error.message });
  }
});

apiRouter.post('/admin/restore-examples', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    seedExamples();
    res.json({ success: true, message: 'Sample records restored.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to restore sample records', details: error.message });
  }
});
