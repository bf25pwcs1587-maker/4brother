-- ==============================================================================
-- 4broters — PostgreSQL Schema & Row Level Security (RLS) Migrations
-- Family Hub for: Mahmood Khan, Azhar Mahmood, Talha Mahmood, Sabaz Ali Khan
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FAMILY PROFILES TABLE
-- Connected to auth.users (Supabase Auth). Public signup disabled in Auth settings.
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

-- Profiles Policies: Authenticated family members can view all brother profiles
CREATE POLICY "Profiles viewable by authenticated family members"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Brothers can update only their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 3. PRIVATE NOTES TABLE (STRICT RLS)
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

CREATE INDEX IF NOT EXISTS idx_private_notes_user_id ON public.private_notes(user_id);
ALTER TABLE public.private_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Private notes: viewable only by owner"
    ON public.private_notes FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Private notes: insertable only by owner"
    ON public.private_notes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Private notes: updatable only by owner"
    ON public.private_notes FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Private notes: deletable only by owner"
    ON public.private_notes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 4. PERSONAL TRANSACTIONS (INCOME & EXPENSES - STRICT RLS)
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

CREATE INDEX IF NOT EXISTS idx_personal_tx_user_id ON public.personal_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_tx_date ON public.personal_transactions(date);
ALTER TABLE public.personal_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Personal money: viewable only by owner"
    ON public.personal_transactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Personal money: insertable only by owner"
    ON public.personal_transactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Personal money: updatable only by owner"
    ON public.personal_transactions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Personal money: deletable only by owner"
    ON public.personal_transactions FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


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

CREATE INDEX IF NOT EXISTS idx_private_tasks_user_id ON public.private_tasks(user_id);
ALTER TABLE public.private_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Private tasks: viewable only by owner"
    ON public.private_tasks FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Private tasks: insertable only by owner"
    ON public.private_tasks FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Private tasks: updatable only by owner"
    ON public.private_tasks FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Private tasks: deletable only by owner"
    ON public.private_tasks FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- 6. SHARED FAMILY INCOME (SHARED SPACE - ALL 4 BROTHERS)
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

CREATE POLICY "Shared income: viewable by authenticated family"
    ON public.shared_income FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Shared income: insertable by authenticated family"
    ON public.shared_income FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Shared income: updatable by authenticated family"
    ON public.shared_income FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Shared income: deletable by authenticated family"
    ON public.shared_income FOR DELETE
    TO authenticated
    USING (true);


-- 7. SHARED FAMILY TASKS (SHARED SPACE - ALL 4 BROTHERS)
CREATE TABLE IF NOT EXISTS public.shared_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    description TEXT DEFAULT '',
    due_date DATE,
    due_time TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    assigned_to_name TEXT NOT NULL,
    assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL,
    updated_by_name TEXT,
    is_example BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.shared_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shared tasks: viewable by authenticated family"
    ON public.shared_tasks FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Shared tasks: insertable by authenticated family"
    ON public.shared_tasks FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Shared tasks: updatable by authenticated family"
    ON public.shared_tasks FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Shared tasks: deletable by authenticated family"
    ON public.shared_tasks FOR DELETE
    TO authenticated
    USING (true);


-- 8. FAMILY PLANS & GATHERINGS (SHARED SPACE)
CREATE TABLE IF NOT EXISTS public.family_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    description TEXT DEFAULT '',
    date DATE NOT NULL,
    time TEXT DEFAULT '',
    location TEXT DEFAULT '',
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL,
    updated_by_name TEXT,
    is_example BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.family_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family plans: viewable by authenticated family"
    ON public.family_plans FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Family plans: insertable by authenticated family"
    ON public.family_plans FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Family plans: updatable by authenticated family"
    ON public.family_plans FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Family plans: deletable by authenticated family"
    ON public.family_plans FOR DELETE
    TO authenticated
    USING (true);


-- 9. FAMILY ANNOUNCEMENTS & UPDATES (SHARED SPACE)
CREATE TABLE IF NOT EXISTS public.family_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(title) >= 1),
    content TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT 'Announcement',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_name TEXT NOT NULL,
    updated_by_name TEXT,
    is_example BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.family_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements: viewable by authenticated family"
    ON public.family_announcements FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Announcements: insertable by authenticated family"
    ON public.family_announcements FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Announcements: updatable by authenticated family"
    ON public.family_announcements FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Announcements: deletable by authenticated family"
    ON public.family_announcements FOR DELETE
    TO authenticated
    USING (true);

-- ==============================================================================
-- ADMIN INSTRUCTIONS FOR 4 BROTHERS ACCOUNTS PROVISIONING:
-- Run in Supabase SQL editor or create via Supabase Dashboard > Authentication > Users:
-- 1. mahmood@4broters.local -> Mahmood Khan
-- 2. azhar@4broters.local   -> Azhar Mahmood
-- 3. talha@4broters.local   -> Talha Mahmood
-- 4. sabaz@4broters.local   -> Sabaz Ali Khan
--
-- Disable "Enable Email Signups" in Supabase Auth Settings to forbid public registration.
-- ==============================================================================
