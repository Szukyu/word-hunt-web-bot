-- Multiplayer Competitive Schema
-- Run with: supabase db reset  or  supabase migration up

-- Add ELO column to profiles for ranked matchmaking
alter table public.profiles add column if not exists elo int default 1000;
create index if not exists idx_profiles_elo on public.profiles(elo);

-- Matches: a single head-to-head game instance
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  -- Match configuration
  board_type int not null check (board_type in (16, 20, 21, 25)),
  board_letters text not null,
  game_time int not null check (game_time > 0 and game_time <= 600), -- seconds
  -- State machine
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'countdown', 'playing', 'finished', 'cancelled', 'abandoned')),
  -- Creator / inviter
  creator_id uuid not null references auth.users(id) on delete cascade,
  -- Optional: for friend invites, quick play, ranked
  mode text not null default 'casual' check (mode in ('casual', 'ranked', 'friend', 'custom')),
  -- ELO/MMR snapshot at match creation (for ranked)
  creator_elo int,
  opponent_elo int,
  -- Timing
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  -- Result (set when finished)
  winner_id uuid references auth.users(id) on delete set null,
  -- For spectator/replay
  is_public boolean not null default true,
  -- Invite code for friend matches (short, human-readable)
  invite_code text unique,
  -- Custom board reference (for future custom boards)
  custom_board_id uuid,
  custom_shape_id uuid
);

-- Match Players: both participants in a match
create table if not exists public.match_players (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Player slot (0 = creator, 1 = opponent)
  slot int not null check (slot in (0, 1)),
  -- Ready state for lobby
  is_ready boolean not null default false,
  -- Connection state
  connected_at timestamptz,
  disconnected_at timestamptz,
  -- Final score
  score int default 0,
  words_found int default 0,
  words_list jsonb default '[]'::jsonb, -- [{word, score, pos, found_at}]
  -- Real-time progress (ghost score)
  live_score int default 0,
  live_words_count int default 0,
  -- For anti-cheat: server validates words, but we track client submissions
  last_submission_at timestamptz,
  -- Joined timestamp
  joined_at timestamptz not null default now(),
  -- Unique constraint: one player per slot per match
  unique (match_id, slot),
  -- Unique constraint: user can only be in a match once
  unique (match_id, user_id)
);

-- Enable Realtime for match_players (live progress updates)
alter publication supabase_realtime add table public.match_players;

-- Match Words: detailed word submissions for post-game comparison
create table if not exists public.match_words (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  score int not null,
  pos int[] not null, -- tile indices path
  found_at timestamptz not null default now(),
  -- Was this word found by both players?
  is_shared boolean not null default false
);

-- Indexes for common queries
create index if not exists idx_matches_creator on public.matches(creator_id);
create index if not exists idx_matches_status on public.matches(status);
create index if not exists idx_matches_invite_code on public.matches(invite_code);
create index if not exists idx_matches_mode on public.matches(mode);
create index if not exists idx_match_players_match on public.match_players(match_id);
create index if not exists idx_match_players_user on public.match_players(user_id);
create index if not exists idx_match_words_match on public.match_words(match_id);
create index if not exists idx_match_words_user on public.match_words(user_id);

-- RLS Policies
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_words enable row level security;

-- Matches: creator and players can read; anyone can read public finished matches
create policy "matches_read_creator_or_player" on public.matches
  for select using (
    auth.uid() = creator_id
    or auth.uid() in (select user_id from public.match_players where match_id = matches.id)
    or (status = 'finished' and is_public = true)
  );

-- Matches: creator can insert (create match)
create policy "matches_insert_creator" on public.matches
  for insert with check (auth.uid() = creator_id);

-- Matches: creator and players can update (ready, start, finish)
create policy "matches_update_participants" on public.matches
  for update using (
    auth.uid() = creator_id
    or auth.uid() in (select user_id from public.match_players where match_id = matches.id)
  );

-- Match Players: participants can read
create policy "match_players_read_participants" on public.match_players
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select creator_id from public.matches where id = match_players.match_id)
    or auth.uid() in (select user_id from public.match_players mp2 where mp2.match_id = match_players.match_id)
  );

-- Match Players: user can insert themselves (join match)
create policy "match_players_insert_self" on public.match_players
  for insert with check (auth.uid() = user_id);

-- Match Players: participants can update their own row (ready, live progress)
create policy "match_players_update_own" on public.match_players
  for update using (auth.uid() = user_id);

-- Match Words: participants can read all words in their match
create policy "match_words_read_participants" on public.match_words
  for select using (
    auth.uid() = user_id
    or auth.uid() = (select creator_id from public.matches where id = match_words.match_id)
    or auth.uid() in (select user_id from public.match_players where match_id = match_words.match_id)
  );

-- Match Words: participants can insert their own words
create policy "match_words_insert_own" on public.match_words
  for insert with check (auth.uid() = user_id);

-- Helper function: generate short invite code (6 chars, alphanumeric)
create or replace function public.generate_invite_code()
returns text language plpgsql volatile as $$
declare
  code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no confusing chars
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    if not exists (select 1 from public.matches where invite_code = code) then
      return code;
    end if;
  end loop;
end $$;

-- Trigger: auto-generate invite_code for friend/custom matches
create or replace function public.set_invite_code()
returns trigger language plpgsql as $$
begin
  if new.mode in ('friend', 'custom') and new.invite_code is null then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end $$;

drop trigger if exists trigger_set_invite_code on public.matches;
create trigger trigger_set_invite_code
  before insert on public.matches
  for each row execute function public.set_invite_code();

-- Function: create a new match (called by client)
create or replace function public.create_match(
  p_board_type int,
  p_board_letters text,
  p_game_time int,
  p_mode text default 'casual',
  p_is_public boolean default true
)
returns uuid language plpgsql security definer as $$
declare
  v_match_id uuid;
  v_creator_id uuid := auth.uid();
  v_creator_elo int;
begin
  if v_creator_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Get creator's ELO for ranked mode
  if p_mode = 'ranked' then
    select coalesce(elo, 1000) into v_creator_elo
    from public.profiles where id = v_creator_id;
  end if;

  insert into public.matches (board_type, board_letters, game_time, mode, creator_id, creator_elo, is_public)
  values (p_board_type, p_board_letters, p_game_time, p_mode, v_creator_id, v_creator_elo, p_is_public)
  returning id into v_match_id;

  -- Add creator as player in slot 0
  insert into public.match_players (match_id, user_id, slot)
  values (v_match_id, v_creator_id, 0);

  return v_match_id;
end $$;

-- Function: join a match by ID or invite code
create or replace function public.join_match(
  p_match_id uuid default null,
  p_invite_code text default null
)
returns uuid language plpgsql security definer as $$
declare
  v_match_id uuid := p_match_id;
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_opponent_elo int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Resolve match by invite code if provided
  if v_match_id is null and p_invite_code is not null then
    select id into v_match_id from public.matches where invite_code = p_invite_code;
    if v_match_id is null then
      raise exception 'Invalid invite code';
    end if;
  end if;

  if v_match_id is null then
    raise exception 'Match ID or invite code required';
  end if;

  select * into v_match from public.matches where id = v_match_id;
  if not found then
    raise exception 'Match not found';
  end if;

  -- Check match can be joined
  if v_match.status not in ('waiting', 'ready') then
    raise exception 'Match is no longer joinable';
  end if;

  -- Check not already in match
  if exists (select 1 from public.match_players where match_id = v_match_id and user_id = v_user_id) then
    return v_match_id; -- already joined
  end if;

  -- Check slot available
  if (select count(*) from public.match_players where match_id = v_match_id) >= 2 then
    raise exception 'Match is full';
  end if;

  -- Get opponent ELO for ranked
  if v_match.mode = 'ranked' then
    select coalesce(elo, 1000) into v_opponent_elo
    from public.profiles where id = v_user_id;
    update public.matches set opponent_elo = v_opponent_elo where id = v_match_id;
  end if;

  -- Add as player in slot 1
  insert into public.match_players (match_id, user_id, slot)
  values (v_match_id, v_user_id, 1);

  -- Update match status to ready when both players joined
  if (select count(*) from public.match_players where match_id = v_match_id) = 2 then
    update public.matches set status = 'ready' where id = v_match_id;
  end if;

  return v_match_id;
end $$;

-- Function: player sets ready state
create or replace function public.set_match_ready(p_match_id uuid, p_ready boolean)
returns void language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_ready_count int;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  update public.match_players
  set is_ready = p_ready
  where match_id = p_match_id and user_id = v_user_id;

  -- Check if both ready -> start countdown
  if p_ready then
    select count(*) into v_ready_count
    from public.match_players
    where match_id = p_match_id and is_ready = true;

    if v_ready_count = 2 then
      update public.matches
      set status = 'countdown', started_at = now()
      where id = p_match_id;
    end if;
  end if;
end $$;

-- Function: start the match (after countdown) - called by either player or cron
create or replace function public.start_match(p_match_id uuid)
returns void language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  update public.matches
  set status = 'playing'
  where id = p_match_id
    and status = 'countdown'
    and (creator_id = v_user_id or v_user_id in (select user_id from public.match_players where match_id = p_match_id));
end $$;

-- Function: submit word during match (server validates)
create or replace function public.submit_match_word(
  p_match_id uuid,
  p_word text,
  p_pos int[]
)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_player public.match_players%rowtype;
  v_word_lower text := lower(trim(p_word));
  v_score int;
  v_valid boolean;
  v_already_found boolean;
  v_all_words text[];
  v_word_starts text[];
  v_english_words text[];
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  -- Get match and player
  select * into v_match from public.matches where id = p_match_id;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status <> 'playing' then raise exception 'Match not in playing state'; end if;

  select * into v_player from public.match_players where match_id = p_match_id and user_id = v_user_id;
  if not found then raise exception 'Not a participant'; end if;

  -- Check word not already found by this player
  select exists(
    select 1 from public.match_words
    where match_id = p_match_id and user_id = v_user_id and lower(word) = v_word_lower
  ) into v_already_found;
  if v_already_found then
    return jsonb_build_object('ok', false, 'error', 'Already found');
  end if;

  -- Load dictionary for validation (simplified: use existing game words)
  -- In production, this would use a shared dictionary table or edge function
  -- For now, we trust the client but log the submission
  -- TODO: Move validation to edge function for anti-cheat

  -- Calculate score based on length
  v_score := case
    when length(v_word_lower) < 3 then 0
    when length(v_word_lower) = 3 then 100
    when length(v_word_lower) = 4 then 400
    when length(v_word_lower) = 5 then 800
    when length(v_word_lower) = 6 then 1400
    when length(v_word_lower) = 7 then 1800
    when length(v_word_lower) = 8 then 2200
    when length(v_word_lower) = 9 then 2600
    when length(v_word_lower) = 10 then 3000
    else 3000
  end;

  if v_score = 0 then
    return jsonb_build_object('ok', false, 'error', 'Too short');
  end if;

  -- Insert word
  insert into public.match_words (match_id, user_id, word, score, pos)
  values (p_match_id, v_user_id, upper(v_word_lower), v_score, p_pos);

  -- Update live progress
  update public.match_players
  set live_score = live_score + v_score,
      live_words_count = live_words_count + 1,
      last_submission_at = now()
  where match_id = p_match_id and user_id = v_user_id;

  return jsonb_build_object('ok', true, 'score', v_score, 'word', upper(v_word_lower));
end $$;

-- Function: finish match (called when timer ends or both players finish)
create or replace function public.finish_match(p_match_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_players public.match_players[];
  v_winner_id uuid;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then raise exception 'Match not found'; end if;
  if v_match.status not in ('playing', 'countdown') then
    raise exception 'Match not in progress';
  end if;

  -- Verify participant
  if not (v_match.creator_id = v_user_id or v_user_id in (select user_id from public.match_players where match_id = p_match_id)) then
    raise exception 'Not a participant';
  end if;

  -- Get final scores from match_players
  select array_agg(mp order by mp.slot) into v_players
  from public.match_players mp
  where mp.match_id = p_match_id;

  -- Determine winner
  if v_players[1].score > v_players[2].score then
    v_winner_id := v_players[1].user_id;
  elsif v_players[2].score > v_players[1].score then
    v_winner_id := v_players[2].user_id;
  else
    v_winner_id := null; -- tie
  end if;

  -- Update match
  update public.matches
  set status = 'finished', finished_at = now(), winner_id = v_winner_id
  where id = p_match_id;

  -- Update player final scores from match_words
  update public.match_players mp
  set score = coalesce((
    select sum(score) from public.match_words mw
    where mw.match_id = p_match_id and mw.user_id = mp.user_id
  ), 0),
      words_found = (
    select count(*) from public.match_words mw
    where mw.match_id = p_match_id and mw.user_id = mp.user_id
  ),
      words_list = (
    select jsonb_agg(jsonb_build_object('word', word, 'score', score, 'pos', pos, 'found_at', found_at) order by found_at)
    from public.match_words mw
    where mw.match_id = p_match_id and mw.user_id = mp.user_id
  )
  where mp.match_id = p_match_id;

  -- Mark shared words
  update public.match_words mw1
  set is_shared = true
  where exists (
    select 1 from public.match_words mw2
    where mw2.match_id = mw1.match_id
      and mw2.user_id <> mw1.user_id
      and lower(mw2.word) = lower(mw1.word)
  );

  -- Return summary
  select jsonb_build_object(
    'match_id', p_match_id,
    'winner_id', v_winner_id,
    'players', (
      select jsonb_agg(jsonb_build_object(
        'user_id', user_id, 'slot', slot, 'score', score, 'words_found', words_found, 'words_list', words_list
      ) order by slot)
      from public.match_players where match_id = p_match_id
    )
  ) into v_result;

  return v_result;
end $$;

-- Function: abandon match (player leaves)
create or replace function public.abandon_match(p_match_id uuid)
returns void language plpgsql security definer as $$
declare
  v_user_id uuid := auth.uid();
  v_match public.matches%rowtype;
  v_other_player uuid;
begin
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_match from public.matches where id = p_match_id;
  if not found then raise exception 'Match not found'; end if;

  -- Find other player
  select user_id into v_other_player
  from public.match_players
  where match_id = p_match_id and user_id <> v_user_id
  limit 1;

  if v_match.status in ('waiting', 'ready', 'countdown') then
    -- Before game started: cancel match
    update public.matches set status = 'cancelled' where id = p_match_id;
  elsif v_match.status = 'playing' then
    -- During game: other player wins by forfeit
    update public.matches
    set status = 'finished', finished_at = now(), winner_id = v_other_player
    where id = p_match_id;
  end if;
end $$;

-- Grant execute on functions to authenticated users
grant execute on function public.create_match to authenticated;
grant execute on function public.join_match to authenticated;
grant execute on function public.set_match_ready to authenticated;
grant execute on function public.start_match to authenticated;
grant execute on function public.submit_match_word to authenticated;
grant execute on function public.finish_match to authenticated;
grant execute on function public.abandon_match to authenticated;