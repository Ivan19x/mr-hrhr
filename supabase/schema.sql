-- MR_HRHR database schema for Supabase.
-- Run once: Supabase dashboard → SQL Editor → New query → paste this file → Run.
-- Safe to run again (it only creates what is missing).

-- One row per player, linked to Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  xp integer not null default 0,
  balance numeric not null default 10000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Best result per level (strategy levels and lesson games).
create table if not exists public.level_results (
  user_id uuid not null references public.profiles (id) on delete cascade,
  level_id text not null,
  stars smallint not null check (stars between 0 and 3),
  score integer not null,
  r numeric not null default 0,
  won boolean not null default false,
  first_try_score integer, -- the score that counts for leaderboards
  completed_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

-- Passed Academy quizzes.
create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id text not null,
  best numeric not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Row level security: players can read and write only their own rows.
alter table public.profiles enable row level security;
alter table public.level_results enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "own results" on public.level_results;
create policy "own results" on public.level_results for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own lessons" on public.lesson_progress;
create policy "own lessons" on public.lesson_progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public leaderboard: usernames and totals only, readable by everyone.
create or replace view public.leaderboard with (security_invoker = false) as
  select p.username, p.xp,
         coalesce(sum(r.first_try_score), 0) as first_try_total,
         count(r.level_id) as levels_played
  from public.profiles p
  left join public.level_results r on r.user_id = p.id
  group by p.id, p.username, p.xp;
grant select on public.leaderboard to anon, authenticated;

-- The player count shown in Settings (no personal data).
create or replace function public.player_count() returns bigint
  language sql security definer set search_path = public as $$ select count(*) from public.profiles $$;
grant execute on function public.player_count() to anon, authenticated;
