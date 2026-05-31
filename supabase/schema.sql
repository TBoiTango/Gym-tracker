-- ═══════════════════════════════════════════════════════════════════════════
-- Gym Tracker — Supabase Schema
-- Run this entire file in your Supabase project's SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable Row Level Security (RLS) so users can only see their own data.
-- Every table below has an RLS policy that checks auth.uid().

-- ── 1. profiles ──────────────────────────────────────────────────────────────
-- Extends Supabase's built-in auth.users table with gym-specific fields.
create table if not exists profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  goal          text not null check (goal in ('strength', 'hypertrophy', 'endurance')),
  created_at    timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view and edit their own profile"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. gyms ──────────────────────────────────────────────────────────────────
-- A shared list of gyms. Users link to a gym via user_gyms.
create table if not exists gyms (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  address text
);

alter table gyms enable row level security;

-- Anyone authenticated can read gyms (needed for search).
create policy "Authenticated users can read gyms"
  on gyms for select
  using (auth.role() = 'authenticated');

-- Users can insert new gyms (e.g. when their gym isn't in the list).
create policy "Authenticated users can insert gyms"
  on gyms for insert
  with check (auth.role() = 'authenticated');

-- ── 3. user_gyms ─────────────────────────────────────────────────────────────
-- Links a user to a gym and stores their equipment list as a JSON array.
-- e.g. equipment_list: ["barbell", "dumbbells", "cable_machine", "pull_up_bar"]
create table if not exists user_gyms (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  gym_id         uuid not null references gyms(id) on delete cascade,
  equipment_list jsonb not null default '[]',
  created_at     timestamptz not null default now(),
  unique (user_id, gym_id)
);

alter table user_gyms enable row level security;

create policy "Users manage their own gym links"
  on user_gyms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. workout_plans ─────────────────────────────────────────────────────────
-- Stores the AI-generated plan as JSON. Only one plan is active at a time.
-- plan_data shape: { days: [ { day_name, muscle_focus, exercises: [ { name, sets, rep_range, rest_seconds, coaching_note } ] } ] }
create table if not exists workout_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  split_type text not null,
  plan_data  jsonb not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table workout_plans enable row level security;

create policy "Users manage their own plans"
  on workout_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. workout_sessions ──────────────────────────────────────────────────────
-- One row per gym visit. plan_day matches a day_name from the active plan.
create table if not exists workout_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  plan_day     text not null,
  started_at   timestamptz not null default now(),
  completed_at timestamptz
);

alter table workout_sessions enable row level security;

create policy "Users manage their own sessions"
  on workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. exercise_logs ─────────────────────────────────────────────────────────
-- One row per exercise performed in a session.
-- reps_per_set and weight_per_set are arrays indexed by set number.
-- e.g. reps_per_set: [10, 10, 8], weight_per_set: [60, 60, 65]
create table if not exists exercise_logs (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references workout_sessions(id) on delete cascade,
  exercise_name   text not null,
  sets_completed  int not null default 0,
  reps_per_set    jsonb not null default '[]',
  weight_per_set  jsonb not null default '[]',
  notes           text,
  logged_at       timestamptz not null default now()
);

alter table exercise_logs enable row level security;

-- Join through workout_sessions to verify ownership.
create policy "Users manage their own exercise logs"
  on exercise_logs for all
  using (
    exists (
      select 1 from workout_sessions ws
      where ws.id = exercise_logs.session_id
        and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workout_sessions ws
      where ws.id = exercise_logs.session_id
        and ws.user_id = auth.uid()
    )
  );

-- ── 7. plan_suggestions ──────────────────────────────────────────────────────
-- Stores AI-generated plan variation suggestions every 4 weeks.
-- User can accept (triggers a new workout_plan row) or reject.
create table if not exists plan_suggestions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  suggested_plan jsonb not null,
  reason         text not null,
  accepted       boolean,
  created_at     timestamptz not null default now()
);

alter table plan_suggestions enable row level security;

create policy "Users manage their own suggestions"
  on plan_suggestions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Helper: auto-create profile on signup ────────────────────────────────────
-- This trigger fires when a new user signs up via Supabase Auth.
-- It creates a placeholder profile row. The user then completes setup.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, name, experience_level, goal)
  values (new.id, '', 'beginner', 'strength')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
