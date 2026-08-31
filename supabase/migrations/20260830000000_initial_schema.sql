-- Word Hunt Initial Schema
-- Covers: profiles, games, daily_puzzles, daily_scores, custom_boards, custom_shapes, themes, friendships, achievements
-- Compatible with existing AuthContext that inserts into `users` (virtualEmail flow)

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Helper: updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =============================================
-- 1. PROFILES (canonical) + USERS (compat)
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  display_name text,
  avatar_url text,
  is_public boolean not null default true,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_daily_date date,
  total_games integer not null default 0,
  total_points integer not null default 0,
  best_score integer not null default 0,
  longest_word text,
  total_playtime_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep legacy `users` table for backward-compat with src/context/AuthContext.jsx
-- If you already have a `users` table in production, this is no-op.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  created_at timestamptz not null default now()
);

-- Sync triggers between profiles <-> users so both stay consistent
create or replace function public.sync_profiles_to_users()
returns trigger as $$
begin
  insert into public.users (id, username)
  values (new.id, new.username)
  on conflict (id) do update set username = excluded.username;
  return new;
end;
$$ language plpgsql security definer;

create or replace function public.sync_users_to_profiles()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.username)
  on conflict (id) do update set username = excluded.username;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_sync_profiles_to_users on public.profiles;
create trigger trg_sync_profiles_to_users
  after insert or update of username on public.profiles
  for each row execute function public.sync_profiles_to_users();

drop trigger if exists trg_sync_users_to_profiles on public.users;
create trigger trg_sync_users_to_profiles
  after insert or update of username on public.users
  for each row execute function public.sync_users_to_profiles();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on auth.users insert (email signup)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'username',''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- 2. GAMES (all play history, stats source)
-- =============================================
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  board_type integer not null check (board_type in (16,20,21,25) or board_type between 9 and 64),
  board_letters text not null check (char_length(board_letters) = board_type),
  game_time integer not null check (game_time > 0), -- time control selected (s)
  score integer not null default 0 check (score >= 0),
  words_found jsonb not null default '[]'::jsonb, -- [{word, score, pos}]
  words_count integer not null default 0,
  total_possible_score integer not null default 0,
  total_possible_words integer not null default 0,
  percent_score double precision, -- score / total_possible_score * 100
  percent_words double precision, -- words_count / total_possible_words * 100
  longest_word text,
  longest_word_length integer,
  score_distribution jsonb default '{}'::jsonb, -- {"3":2,"4":1 ...}
  is_daily boolean not null default false,
  puzzle_date date, -- nullable, set if is_daily
  created_at timestamptz not null default now()
);

create index if not exists idx_games_user_id on public.games(user_id);
create index if not exists idx_games_created_at on public.games(created_at desc);
create index if not exists idx_games_board_type on public.games(board_type);
create index if not exists idx_games_user_board on public.games(user_id, board_type);
create index if not exists idx_games_puzzle_date on public.games(puzzle_date) where is_daily = true;

-- =============================================
-- 3. DAILY PUZZLES (seeded board, one per day per board_type)
-- =============================================
create table if not exists public.daily_puzzles (
  id uuid primary key default gen_random_uuid(),
  puzzle_date date not null,
  board_type integer not null check (board_type in (16,20,21,25)),
  board_letters text not null,
  solution_words jsonb, -- [{word, score}]
  solution_word_count integer,
  total_possible_score integer,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  unique (puzzle_date, board_type),
  check (char_length(board_letters) = board_type)
);

create index if not exists idx_daily_puzzles_date on public.daily_puzzles(puzzle_date desc);

-- =============================================
-- 4. DAILY SCORES (one attempt per user per day per board_type)
-- =============================================
create table if not exists public.daily_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  puzzle_date date not null,
  board_type integer not null check (board_type in (16,20,21,25)),
  score integer not null default 0,
  words_found jsonb not null default '[]'::jsonb,
  words_count integer not null default 0,
  total_possible_score integer,
  total_possible_words integer,
  percent_score double precision,
  longest_word text,
  streak_at_time integer,
  created_at timestamptz not null default now(),
  unique (user_id, puzzle_date, board_type),
  foreign key (puzzle_date, board_type) references public.daily_puzzles(puzzle_date, board_type) on delete cascade
);

create index if not exists idx_daily_scores_puzzle on public.daily_scores(puzzle_date, board_type);
create index if not exists idx_daily_scores_user on public.daily_scores(user_id);
create index if not exists idx_daily_scores_leaderboard on public.daily_scores(puzzle_date, board_type, score desc);

-- Streak helper: update profiles.current_streak / longest_streak on daily_scores insert
create or replace function public.handle_daily_streak()
returns trigger as $$
declare
  last_date date;
  cur_streak int;
begin
  select last_daily_date, current_streak into last_date, cur_streak from public.profiles where id = new.user_id;

  if last_date is null then
    cur_streak := 1;
  elsif new.puzzle_date = last_date + 1 then
    cur_streak := cur_streak + 1;
  elsif new.puzzle_date = last_date then
    -- same day different board_type, don't bump streak again
    return new;
  elsif new.puzzle_date > last_date + 1 then
    cur_streak := 1;
  else
    -- out-of-order insert (backfill), don't affect streak
    return new;
  end if;

  update public.profiles
  set
    current_streak = cur_streak,
    longest_streak = greatest(longest_streak, cur_streak),
    last_daily_date = greatest(last_daily_date, new.puzzle_date)
  where id = new.user_id;

  new.streak_at_time := cur_streak;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_daily_streak on public.daily_scores;
create trigger trg_daily_streak
  before insert on public.daily_scores
  for each row execute function public.handle_daily_streak();

-- =============================================
-- 5. CUSTOM BOARDS (letter boards)
-- =============================================
create table if not exists public.custom_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  board_type integer not null check (board_type in (16,20,21,25) or board_type between 9 and 64),
  letters text not null check (char_length(letters) = board_type),
  word_count integer,
  max_score integer,
  longest_words jsonb default '[]'::jsonb,
  is_public boolean not null default false,
  upvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_custom_boards_user on public.custom_boards(user_id);
create index if not exists idx_custom_boards_public on public.custom_boards(is_public, upvotes desc) where is_public = true;

drop trigger if exists trg_custom_boards_updated_at on public.custom_boards;
create trigger trg_custom_boards_updated_at
  before update on public.custom_boards
  for each row execute function public.handle_updated_at();

-- =============================================
-- 6. CUSTOM SHAPES (shape editor)
-- =============================================
create table if not exists public.custom_shapes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  width integer not null check (width between 3 and 8),
  height integer not null check (height between 3 and 8),
  active_tiles integer[] not null, -- grid indices that are active
  tile_count integer not null check (tile_count >= 9),
  adjacency_map jsonb, -- cached adjacency for solver
  is_public boolean not null default false,
  upvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (tile_count = array_length(active_tiles, 1))
);

create index if not exists idx_custom_shapes_user on public.custom_shapes(user_id);
create index if not exists idx_custom_shapes_public on public.custom_shapes(is_public, upvotes desc) where is_public = true;

drop trigger if exists trg_custom_shapes_updated_at on public.custom_shapes;
create trigger trg_custom_shapes_updated_at
  before update on public.custom_shapes
  for each row execute function public.handle_updated_at();

-- =============================================
-- 7. THEMES (community gallery)
-- =============================================
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade, -- null = system theme
  slug text unique not null check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 40),
  colors jsonb not null, -- { background, tile, tileText, accent, ... }
  is_system boolean not null default false,
  is_public boolean not null default false,
  upvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_themes_public on public.themes(is_public, upvotes desc) where is_public = true;
create index if not exists idx_themes_system on public.themes(is_system) where is_system = true;

drop trigger if exists trg_themes_updated_at on public.themes;
create trigger trg_themes_updated_at
  before update on public.themes
  for each row execute function public.handle_updated_at();

-- =============================================
-- 8. FRIENDSHIPS
-- =============================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, friend_id),
  check (user_id <> friend_id)
);

create index if not exists idx_friendships_user on public.friendships(user_id, status);
create index if not exists idx_friendships_friend on public.friendships(friend_id, status);

drop trigger if exists trg_friendships_updated_at on public.friendships;
create trigger trg_friendships_updated_at
  before update on public.friendships
  for each row execute function public.handle_updated_at();

-- =============================================
-- 9. ACHIEVEMENTS (optional, for TODO #9)
-- =============================================
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_]+$'), -- e.g. first_win, 100_words
  unlocked_at timestamptz not null default now(),
  meta jsonb default '{}'::jsonb,
  unique (user_id, key)
);

create index if not exists idx_achievements_user on public.achievements(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.profiles enable row level security;
alter table public.users enable row level security;
alter table public.games enable row level security;
alter table public.daily_puzzles enable row level security;
alter table public.daily_scores enable row level security;
alter table public.custom_boards enable row level security;
alter table public.custom_shapes enable row level security;
alter table public.themes enable row level security;
alter table public.friendships enable row level security;
alter table public.achievements enable row level security;

-- Profiles: public read (for leaderboards), own write
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Users compat: same
drop policy if exists "users_select_all" on public.users;
create policy "users_select_all" on public.users for select using (true);
drop policy if exists "users_insert_own" on public.users;
create policy "users_insert_own" on public.users for insert with check (auth.uid() = id);
drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

-- Games: user can read own + public? for leaderboards allow read all but we restrict to authenticated?
drop policy if exists "games_select_all" on public.games;
create policy "games_select_all" on public.games for select using (true);
drop policy if exists "games_insert_own" on public.games;
create policy "games_insert_own" on public.games for insert with check (auth.uid() = user_id);
drop policy if exists "games_delete_own" on public.games;
create policy "games_delete_own" on public.games for delete using (auth.uid() = user_id);

-- Daily puzzles: public read, authenticated insert (edge function via service_role bypasses RLS)
drop policy if exists "daily_puzzles_select_all" on public.daily_puzzles;
create policy "daily_puzzles_select_all" on public.daily_puzzles for select using (true);
drop policy if exists "daily_puzzles_insert_auth" on public.daily_puzzles;
create policy "daily_puzzles_insert_auth" on public.daily_puzzles for insert with check (auth.role() = 'authenticated');

-- Daily scores: public read for leaderboards, own insert
drop policy if exists "daily_scores_select_all" on public.daily_scores;
create policy "daily_scores_select_all" on public.daily_scores for select using (true);
drop policy if exists "daily_scores_insert_own" on public.daily_scores;
create policy "daily_scores_insert_own" on public.daily_scores for insert with check (auth.uid() = user_id);
drop policy if exists "daily_scores_update_own" on public.daily_scores;
create policy "daily_scores_update_own" on public.daily_scores for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Custom boards: public where is_public, else own
drop policy if exists "custom_boards_select" on public.custom_boards;
create policy "custom_boards_select" on public.custom_boards for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "custom_boards_insert_own" on public.custom_boards;
create policy "custom_boards_insert_own" on public.custom_boards for insert with check (auth.uid() = user_id);
drop policy if exists "custom_boards_update_own" on public.custom_boards;
create policy "custom_boards_update_own" on public.custom_boards for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "custom_boards_delete_own" on public.custom_boards;
create policy "custom_boards_delete_own" on public.custom_boards for delete using (auth.uid() = user_id);

-- Custom shapes: same
drop policy if exists "custom_shapes_select" on public.custom_shapes;
create policy "custom_shapes_select" on public.custom_shapes for select using (is_public = true or auth.uid() = user_id);
drop policy if exists "custom_shapes_insert_own" on public.custom_shapes;
create policy "custom_shapes_insert_own" on public.custom_shapes for insert with check (auth.uid() = user_id);
drop policy if exists "custom_shapes_update_own" on public.custom_shapes;
create policy "custom_shapes_update_own" on public.custom_shapes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "custom_shapes_delete_own" on public.custom_shapes;
create policy "custom_shapes_delete_own" on public.custom_shapes for delete using (auth.uid() = user_id);

-- Themes: system + public + own
drop policy if exists "themes_select" on public.themes;
create policy "themes_select" on public.themes for select using (is_public = true or is_system = true or auth.uid() = user_id);
drop policy if exists "themes_insert_own" on public.themes;
create policy "themes_insert_own" on public.themes for insert with check (auth.uid() = user_id or is_system = true);
drop policy if exists "themes_update_own" on public.themes;
create policy "themes_update_own" on public.themes for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "themes_delete_own" on public.themes;
create policy "themes_delete_own" on public.themes for delete using (auth.uid() = user_id);

-- Friendships: can read if involved
drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships for select using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists "friendships_insert_own" on public.friendships;
create policy "friendships_insert_own" on public.friendships for insert with check (auth.uid() = user_id);
drop policy if exists "friendships_update_own" on public.friendships;
create policy "friendships_update_own" on public.friendships for update using (auth.uid() = user_id or auth.uid() = friend_id);
drop policy if exists "friendships_delete_own" on public.friendships;
create policy "friendships_delete_own" on public.friendships for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- Achievements: own read/write via service_role, user can read own
drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements for select using (auth.uid() = user_id);
drop policy if exists "achievements_insert_own" on public.achievements;
create policy "achievements_insert_own" on public.achievements for insert with check (auth.uid() = user_id);

-- =============================================
-- VIEWS / HELPERS
-- =============================================
-- Leaderboard helper view (global)
create or replace view public.leaderboard_daily as
  select
    ds.puzzle_date,
    ds.board_type,
    ds.user_id,
    p.username,
    ds.score,
    ds.words_count,
    ds.percent_score,
    rank() over (partition by ds.puzzle_date, ds.board_type order by ds.score desc) as rank
  from public.daily_scores ds
  join public.profiles p on p.id = ds.user_id;

-- Stats materialized helper: per-user aggregates (recomputed via trigger or on read)
create or replace function public.recompute_profile_stats(target_user uuid)
returns void as $$
begin
  update public.profiles p set
    total_games = (select count(*) from public.games g where g.user_id = target_user),
    total_points = coalesce((select sum(score) from public.games g where g.user_id = target_user),0),
    best_score = coalesce((select max(score) from public.games g where g.user_id = target_user),0)
  where p.id = target_user;
end;
$$ language plpgsql security definer;

-- Trigger to auto-recompute after game insert
create or replace function public.handle_game_stats()
returns trigger as $$
begin
  perform public.recompute_profile_stats(new.user_id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_game_stats on public.games;
create trigger trg_game_stats
  after insert on public.games
  for each row execute function public.handle_game_stats();

-- Grants (Supabase defaults, but ensure)
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
