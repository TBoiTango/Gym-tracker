-- ═══════════════════════════════════════════════════════════════════════════
-- Workout Buddy — Full Supabase Schema (v2)
-- Paste this entire file into Supabase SQL Editor and click Run.
-- Safe to re-run: uses CREATE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. profiles ──────────────────────────────────────────────────────────────
create table if not exists profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  name             text not null default '',
  experience_level text not null default 'beginner' check (experience_level in ('beginner', 'intermediate', 'advanced')),
  goal             text not null default 'strength' check (goal in ('strength', 'hypertrophy', 'endurance')),
  workout_duration int  not null default 60,
  include_cardio   boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table profiles enable row level security;

-- Drop and recreate policy so re-runs don't error
drop policy if exists "Users can view and edit their own profile" on profiles;
create policy "Users can view and edit their own profile"
  on profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add new columns if upgrading from v1
alter table profiles add column if not exists workout_duration int not null default 60;
alter table profiles add column if not exists include_cardio boolean not null default false;
-- workout_style: 'split' (default) | 'no_split' | 'cardio_only'
alter table profiles add column if not exists workout_style text not null default 'split';
-- week_start_at: set by "Restart week" so the weekly ring counts from here
alter table profiles add column if not exists week_start_at timestamptz;

-- ── 2. gyms ──────────────────────────────────────────────────────────────────
create table if not exists gyms (
  id      uuid primary key default gen_random_uuid(),
  name    text not null,
  address text
);

alter table gyms enable row level security;

drop policy if exists "Authenticated users can read gyms" on gyms;
create policy "Authenticated users can read gyms"
  on gyms for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can insert gyms" on gyms;
create policy "Authenticated users can insert gyms"
  on gyms for insert
  with check (auth.role() = 'authenticated');

-- ── 3. user_gyms ─────────────────────────────────────────────────────────────
create table if not exists user_gyms (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  gym_id         uuid not null references gyms(id) on delete cascade,
  equipment_list jsonb not null default '[]',
  created_at     timestamptz not null default now(),
  unique (user_id, gym_id)
);

alter table user_gyms enable row level security;

drop policy if exists "Users manage their own gym links" on user_gyms;
create policy "Users manage their own gym links"
  on user_gyms for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. workout_plans ─────────────────────────────────────────────────────────
-- plan_data shape:
-- { days: [ { day_name, muscle_focus, exercises: [ { name, sets, rep_range, rest_seconds, coaching_note } ] } ] }
create table if not exists workout_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  split_type text not null,
  plan_data  jsonb not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table workout_plans enable row level security;

drop policy if exists "Users manage their own plans" on workout_plans;
create policy "Users manage their own plans"
  on workout_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. workout_sessions ──────────────────────────────────────────────────────
-- exercises_data stores the AI-generated exercises for that specific session
-- (generated fresh each day based on duration/cardio/core choices).
create table if not exists workout_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  plan_day       text not null,
  exercises_data jsonb,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz
);

alter table workout_sessions enable row level security;

drop policy if exists "Users manage their own sessions" on workout_sessions;
create policy "Users manage their own sessions"
  on workout_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add exercises_data if upgrading from v1
alter table workout_sessions add column if not exists exercises_data jsonb;

-- Session metadata columns (upgrades from earlier versions)
alter table workout_sessions add column if not exists muscle_focus text;
-- session_type: null/'workout' | 'rest' | 'cardio' | 'free' | 'bonus' | 'cancelled'
alter table workout_sessions add column if not exists session_type text;
alter table workout_sessions add column if not exists free_format text;
-- cardio_data: intervals/rounds/felt for standalone cardio sessions
alter table workout_sessions add column if not exists cardio_data jsonb;

-- Cancellation tracking — user X'd out of the workout with an optional reason.
-- Cancelled sessions never count as completed and are excluded from
-- "in progress" resume prompts.
alter table workout_sessions add column if not exists cancelled_at timestamptz;
alter table workout_sessions add column if not exists cancel_reason text;

-- ── 6. exercise_logs ─────────────────────────────────────────────────────────
-- One row per exercise performed in a session.
-- reps_per_set and weight_per_set are parallel arrays indexed by set number.
-- All weights stored in lbs.
-- e.g. reps_per_set: [10, 10, 8], weight_per_set: [135, 135, 145]
create table if not exists exercise_logs (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references workout_sessions(id) on delete cascade,
  exercise_name   text not null,
  sets_completed  int not null default 0,
  reps_per_set    jsonb not null default '[]',
  weight_per_set  jsonb not null default '[]',
  notes           text,
  user_added      boolean not null default false,
  logged_at       timestamptz not null default now()
);

-- user_added: true when the exercise was quick-added mid-session (upgrades)
alter table exercise_logs add column if not exists user_added boolean not null default false;

alter table exercise_logs enable row level security;

drop policy if exists "Users manage their own exercise logs" on exercise_logs;
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
create table if not exists plan_suggestions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  suggested_plan jsonb not null,
  reason         text not null,
  accepted       boolean,
  created_at     timestamptz not null default now()
);

alter table plan_suggestions enable row level security;

drop policy if exists "Users manage their own suggestions" on plan_suggestions;
create policy "Users manage their own suggestions"
  on plan_suggestions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 8. user_exercise_preferences ────────────────────────────────────────────
-- Tracks exercises the user repeatedly skips so the generator stops suggesting them.
-- skip_count increments each time the user X's the exercise out of a session.
-- do_not_suggest is set to true once skip_count reaches 3.
create table if not exists user_exercise_preferences (
  user_id         uuid not null references auth.users(id) on delete cascade,
  exercise_name   text not null,
  skip_count      int not null default 1,
  do_not_suggest  boolean not null default false,
  last_skipped_at timestamptz not null default now(),
  primary key (user_id, exercise_name)
);

alter table user_exercise_preferences enable row level security;

drop policy if exists "Users manage their own exercise preferences" on user_exercise_preferences;
create policy "Users manage their own exercise preferences"
  on user_exercise_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 9. user_exercise_pool ────────────────────────────────────────────────────
-- Per-day-type pool of exercises the user has quick-added. The generator pulls
-- least-recently-used ones back in so added exercises rotate into future
-- sessions. last_included_at is bumped when an exercise is used again.
create table if not exists user_exercise_pool (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  day_type        text not null,
  exercise_name   text not null,
  sets            int not null default 3,
  rep_range       text not null default '8-12',
  rest_seconds    int not null default 60,
  coaching_note   text not null default '',
  times_added     int not null default 1,
  last_included_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (user_id, day_type, exercise_name)
);

alter table user_exercise_pool enable row level security;

drop policy if exists "Users manage their own exercise pool" on user_exercise_pool;
create policy "Users manage their own exercise pool"
  on user_exercise_pool for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Auto-create profile on signup ─────────────────────────────────────────────
drop trigger if exists on_auth_user_created on auth.users;

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (user_id, name, experience_level, goal, workout_duration, include_cardio)
  values (new.id, '', 'beginner', 'strength', 60, false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
