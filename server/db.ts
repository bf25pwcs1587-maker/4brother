import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Ensure data directory exists
const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, '4broters.db');
export const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

export function hashPassword(password: string, salt = '4broters-salt-2026'): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

export function initDatabase() {
  // 1. Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      brother_key TEXT NOT NULL UNIQUE,
      avatar_color TEXT NOT NULL,
      avatar_url TEXT,
      phone_number TEXT,
      role TEXT NOT NULL DEFAULT 'brother',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Safe incremental migrations for existing DB
  try { db.exec('ALTER TABLE users ADD COLUMN avatar_url TEXT;'); } catch {}
  try { db.exec('ALTER TABLE users ADD COLUMN phone_number TEXT;'); } catch {}

  // 2. Sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Private Notes table (Strictly user_id scoped)
  db.exec(`
    CREATE TABLE IF NOT EXISTS private_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 4. Personal Transactions table (Strictly user_id scoped)
  db.exec(`
    CREATE TABLE IF NOT EXISTS personal_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL CHECK(amount > 0),
      currency TEXT NOT NULL DEFAULT 'PKR',
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 5. Private Tasks table (Strictly user_id scoped)
  db.exec(`
    CREATE TABLE IF NOT EXISTS private_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      due_time TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
      category TEXT NOT NULL DEFAULT 'Personal',
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 6. Shared Family Income (All 4 brothers can view & manage)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_income (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      currency TEXT NOT NULL DEFAULT 'PKR',
      source_category TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_by_id TEXT,
      created_by_name TEXT NOT NULL,
      updated_by_name TEXT,
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 7. Shared Family Tasks (All 4 brothers can view & manage)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      due_time TEXT,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
      assigned_to_name TEXT NOT NULL,
      assigned_to_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed')),
      created_by_id TEXT,
      created_by_name TEXT NOT NULL,
      updated_by_name TEXT,
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 8. Family Plans & Gatherings
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      time TEXT,
      location TEXT,
      created_by_id TEXT,
      created_by_name TEXT NOT NULL,
      updated_by_name TEXT,
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // 9. Family Announcements & Updates
  db.exec(`
    CREATE TABLE IF NOT EXISTS family_announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tag TEXT NOT NULL DEFAULT 'Family News',
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_by_id TEXT,
      created_by_name TEXT NOT NULL,
      updated_by_name TEXT,
      is_example INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  seedInitialBrothersAndExamples();
}

export const BROTHERS_CONFIG = [
  {
    brother_key: 'mahmood',
    full_name: 'Mahmood Khan',
    email: 'mahmood@4broters.local',
    defaultPassword: 'mahmood2026',
    avatar_color: '#1e3a8a', // Deep royal navy
    phone_number: '03109796509',
    role: 'brother'
  },
  {
    brother_key: 'azhar',
    full_name: 'Azhar Mahmood',
    email: 'azhar@4broters.local',
    defaultPassword: 'azhar2026',
    avatar_color: '#065f46', // Rich emerald
    phone_number: '+971 55 955 3018',
    role: 'brother'
  },
  {
    brother_key: 'talha',
    full_name: 'Talha Mahmood',
    email: 'talha@4broters.local',
    defaultPassword: 'talha2026',
    avatar_color: '#5b21b6', // Deep purple
    phone_number: '03255691055',
    role: 'brother'
  },
  {
    brother_key: 'sabaz',
    full_name: 'Sabaz Ali Khan',
    email: 'sabaz@4broters.local',
    defaultPassword: 'sabaz2026',
    avatar_color: '#92400e', // Warm amber copper
    phone_number: '03159944181',
    role: 'brother'
  }
];

function seedInitialBrothersAndExamples() {
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const now = new Date().toISOString();

  if (existingUsers.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, brother_key, avatar_color, phone_number, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const b of BROTHERS_CONFIG) {
      const id = crypto.randomUUID();
      insertUser.run(
        id,
        b.email,
        hashPassword(b.defaultPassword),
        b.full_name,
        b.brother_key,
        b.avatar_color,
        b.phone_number,
        b.role,
        now,
        now
      );
    }

    // Seed sample data for demonstrative purposes
    seedExamples();
  } else {
    // Ensure phone numbers are populated for all existing brothers
    for (const b of BROTHERS_CONFIG) {
      db.prepare(`
        UPDATE users
        SET phone_number = ?
        WHERE brother_key = ? AND (phone_number IS NULL OR phone_number = '')
      `).run(b.phone_number, b.brother_key);
    }
  }
}

export function seedExamples() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const isoNow = now.toISOString();

  // Retrieve user IDs
  const users = db.prepare('SELECT id, brother_key, full_name FROM users').all() as Array<{
    id: string;
    brother_key: string;
    full_name: string;
  }>;

  const mahmood = users.find(u => u.brother_key === 'mahmood');
  const azhar = users.find(u => u.brother_key === 'azhar');
  const talha = users.find(u => u.brother_key === 'talha');
  const sabaz = users.find(u => u.brother_key === 'sabaz');

  if (!mahmood || !azhar || !talha || !sabaz) return;

  // Insert sample private notes for each brother
  const insertNote = db.prepare(`
    INSERT INTO private_notes (id, user_id, title, content, category, is_pinned, is_example, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertNote.run(crypto.randomUUID(), mahmood.id, '[Example] Personal goals & vision for 2026', 'Focus on quarterly health milestones, family land renovation checks, and reading daily.', 'Personal', 1, isoNow, isoNow);
  insertNote.run(crypto.randomUUID(), azhar.id, '[Example] Engineering research & project draft', 'Review solar installation specifications for the Peshawar residence and compare quotes.', 'Projects', 1, isoNow, isoNow);
  insertNote.run(crypto.randomUUID(), talha.id, '[Example] Vehicle maintenance & log', 'Routine service scheduled at 45,000 km. Oil change, brake pads check, tire rotation.', 'Maintenance', 0, isoNow, isoNow);
  insertNote.run(crypto.randomUUID(), sabaz.id, '[Example] Agriculture & orchard notes', 'Fertilizer delivery scheduled next Tuesday. Check irrigation canal schedule with local team.', 'Farming', 1, isoNow, isoNow);

  // Insert sample personal transactions (Income & Expense)
  const insertTx = db.prepare(`
    INSERT INTO personal_transactions (id, user_id, type, amount, currency, description, category, date, is_example, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertTx.run(crypto.randomUUID(), mahmood.id, 'income', 185000, 'PKR', '[Example] Professional consulting retainer', 'Salary/Professional', dateStr, isoNow, isoNow);
  insertTx.run(crypto.randomUUID(), mahmood.id, 'expense', 24000, 'PKR', '[Example] Home groceries & essentials', 'Household', dateStr, isoNow, isoNow);
  insertTx.run(crypto.randomUUID(), mahmood.id, 'expense', 15000, 'PKR', '[Example] Fuel & transport expenses', 'Transport', dateStr, isoNow, isoNow);

  insertTx.run(crypto.randomUUID(), azhar.id, 'income', 195000, 'PKR', '[Example] Monthly software engineering salary', 'Salary/Professional', dateStr, isoNow, isoNow);
  insertTx.run(crypto.randomUUID(), azhar.id, 'expense', 32000, 'PKR', '[Example] Technical certifications & hardware upgrade', 'Education/Tech', dateStr, isoNow, isoNow);

  insertTx.run(crypto.randomUUID(), talha.id, 'income', 160000, 'PKR', '[Example] Business revenue / consulting', 'Business', dateStr, isoNow, isoNow);
  insertTx.run(crypto.randomUUID(), talha.id, 'expense', 18500, 'PKR', '[Example] Car maintenance and fuel', 'Transport', dateStr, isoNow, isoNow);

  insertTx.run(crypto.randomUUID(), sabaz.id, 'income', 210000, 'PKR', '[Example] Seasonal harvest / agricultural yield', 'Business/Farming', dateStr, isoNow, isoNow);
  insertTx.run(crypto.randomUUID(), sabaz.id, 'expense', 45000, 'PKR', '[Example] Organic fertilizer & machinery repair', 'Farming/Ops', dateStr, isoNow, isoNow);

  // Insert sample private tasks
  const insertTask = db.prepare(`
    INSERT INTO private_tasks (id, user_id, title, description, due_date, due_time, priority, status, category, is_example, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertTask.run(crypto.randomUUID(), mahmood.id, '[Example] Review medical checkup reports', 'Follow up with physician regarding routine lab results', dateStr, '16:00', 'high', 'pending', 'Health', isoNow, isoNow);
  insertTask.run(crypto.randomUUID(), mahmood.id, '[Example] Renew car registration documents', 'Complete online tax payment and download receipt', dateStr, '11:00', 'medium', 'completed', 'Personal', isoNow, isoNow);

  insertTask.run(crypto.randomUUID(), azhar.id, '[Example] Finalize home backup generator service', 'Check fuel filters and battery voltage', dateStr, '14:30', 'high', 'pending', 'Home', isoNow, isoNow);
  insertTask.run(crypto.randomUUID(), talha.id, '[Example] Book flights for family Eid gathering', 'Compare PIA and Serene schedules for everyone', dateStr, '20:00', 'high', 'pending', 'Travel', isoNow, isoNow);
  insertTask.run(crypto.randomUUID(), sabaz.id, '[Example] Inspect water tube well pressure', 'Ensure generator pump is primed before sunset', dateStr, '17:30', 'medium', 'pending', 'Farming', isoNow, isoNow);

  // Insert sample Shared Family Income
  const insertSharedInc = db.prepare(`
    INSERT INTO shared_income (id, title, amount, currency, source_category, date, notes, created_by_id, created_by_name, updated_by_name, is_example, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertSharedInc.run(
    crypto.randomUUID(),
    '[Example] Commercial Plaza monthly rent (Shop 1-4)',
    280000,
    'PKR',
    'Family Property Rental',
    dateStr,
    'Deposited into the joint family account. Managed collectively.',
    mahmood.id,
    mahmood.full_name,
    mahmood.full_name,
    isoNow,
    isoNow
  );

  insertSharedInc.run(
    crypto.randomUUID(),
    '[Example] Agricultural land crop proceeds',
    350000,
    'PKR',
    'Shared Agriculture',
    dateStr,
    'Harvest sale revenue allocated to the family emergency reserve.',
    sabaz.id,
    sabaz.full_name,
    sabaz.full_name,
    isoNow,
    isoNow
  );

  // Insert sample Shared Tasks
  const insertSharedTask = db.prepare(`
    INSERT INTO shared_tasks (id, title, description, due_date, due_time, priority, assigned_to_name, assigned_to_id, status, created_by_id, created_by_name, updated_by_name, is_example, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertSharedTask.run(
    crypto.randomUUID(),
    '[Example] Finalize Peshawar ancestral home renovation plan',
    'Review architect blueprint for courtyard and guest room expansion.',
    dateStr,
    '18:00',
    'high',
    'All Brothers',
    null,
    'pending',
    mahmood.id,
    mahmood.full_name,
    mahmood.full_name,
    isoNow,
    isoNow
  );

  insertSharedTask.run(
    crypto.randomUUID(),
    '[Example] Verify property tax receipt & legal registry update',
    'Collect signed receipts from the revenue office and archive.',
    dateStr,
    '12:00',
    'medium',
    'Talha Mahmood',
    talha.id,
    'completed',
    azhar.id,
    azhar.full_name,
    azhar.full_name,
    isoNow,
    isoNow
  );

  // Insert sample Family Plans
  const insertPlan = db.prepare(`
    INSERT INTO family_plans (id, title, description, date, time, location, created_by_id, created_by_name, updated_by_name, is_example, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertPlan.run(
    crypto.randomUUID(),
    '[Example] Monthly Family Dinner & Discussion',
    'All four brothers assemble to review collective plans, shared projects, and family milestones.',
    dateStr,
    '20:30',
    'Family Residence, Hayatabad, Peshawar',
    mahmood.id,
    mahmood.full_name,
    mahmood.full_name,
    isoNow,
    isoNow
  );

  insertPlan.run(
    crypto.randomUUID(),
    '[Example] Weekend Visit to Ancestral Village & Orchard',
    'Inspect new fruit orchard grafting and meet community elders.',
    dateStr,
    '09:00',
    'Village Khan Khel',
    sabaz.id,
    sabaz.full_name,
    sabaz.full_name,
    isoNow,
    isoNow
  );

  // Insert sample Family Announcements
  const insertAnn = db.prepare(`
    INSERT INTO family_announcements (id, title, content, tag, is_pinned, created_by_id, created_by_name, updated_by_name, is_example, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
  `);

  insertAnn.run(
    crypto.randomUUID(),
    'Welcome to 4 Brothers Family Hub',
    'This secure platform keeps each brother’s personal finances, tasks, and private notes strictly separated while providing our joint space for shared family income, shared tasks, plans, and announcements.',
    'System / Welcome',
    1,
    mahmood.id,
    mahmood.full_name,
    mahmood.full_name,
    isoNow,
    isoNow
  );

  insertAnn.run(
    crypto.randomUUID(),
    '[Example] Joint Family Fund Quarter Milestone',
    'Alhamdulillah, our collective family reserve for 2026 has crossed the first milestone. Both property rental and agricultural revenues have been safely consolidated.',
    'Finance',
    0,
    azhar.id,
    azhar.full_name,
    azhar.full_name,
    isoNow,
    isoNow
  );
}

export function clearExampleData() {
  db.exec('DELETE FROM private_notes WHERE is_example = 1');
  db.exec('DELETE FROM personal_transactions WHERE is_example = 1');
  db.exec('DELETE FROM private_tasks WHERE is_example = 1');
  db.exec('DELETE FROM shared_income WHERE is_example = 1');
  db.exec('DELETE FROM shared_tasks WHERE is_example = 1');
  db.exec('DELETE FROM family_plans WHERE is_example = 1');
  db.exec('DELETE FROM family_announcements WHERE is_example = 1');
}
