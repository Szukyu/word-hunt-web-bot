-- Seed: system themes + example daily puzzle for today
-- Run with: supabase db reset  or  supabase seed

-- Themes
insert into public.themes (slug, name, colors, is_system, is_public)
values
  ('midnight', 'Midnight', '{"bg":"#0a0e1a","tile":"#1a2332","tileText":"#e2e8f0","accent":"#3b82f6","board":"#1e293b"}', true, true),
  ('nord', 'Nord', '{"bg":"#2e3440","tile":"#3b4252","tileText":"#eceff4","accent":"#88c0d0","board":"#434c5e"}', true, true),
  ('dracula', 'Dracula', '{"bg":"#282a36","tile":"#44475a","tileText":"#f8f8f2","accent":"#bd93f9","board":"#44475a"}', true, true),
  ('solarized-dark', 'Solarized Dark', '{"bg":"#002b36","tile":"#073642","tileText":"#eee8d5","accent":"#268bd2","board":"#073642"}', true, true),
  ('solarized-light', 'Solarized Light', '{"bg":"#fdf6e3","tile":"#eee8d5","tileText":"#657b83","accent":"#268bd2","board":"#eee8d5"}', true, true),
  ('catppuccin-mocha', 'Catppuccin Mocha', '{"bg":"#1e1e2e","tile":"#313244","tileText":"#cdd6f4","accent":"#cba6f7","board":"#313244"}', true, true),
  ('gruvbox', 'Gruvbox', '{"bg":"#282828","tile":"#3c3836","tileText":"#ebdbb2","accent":"#fe8019","board":"#504945"}', true, true),
  ('tokyo-night', 'Tokyo Night', '{"bg":"#1a1b26","tile":"#24283b","tileText":"#c0caf5","accent":"#7aa2f7","board":"#414868"}', true, true),
  ('oled-black', 'OLED Black', '{"bg":"#000000","tile":"#1a1a1a","tileText":"#ffffff","accent":"#ffffff","board":"#111111"}', true, true),
  ('pastel', 'Pastel', '{"bg":"#fdf2f8","tile":"#fce7f3","tileText":"#831843","accent":"#ec4899","board":"#fbcfe8"}', true, true)
on conflict (slug) do nothing;

-- Daily puzzles: do NOT seed 4 rows per day (that caused the “sometimes 4, sometimes 1” bug).
-- The edge function `daily-publish` is the single source of truth: it inserts exactly 1
-- deterministic puzzle per date via chooseDailyBoardType(date) + generateSeededBoard(date, type).
-- Seeding 4 rows (one per board type) left legacy extra rows that were never cleaned up,
-- so some dates had 4 and new dates had 1 after the fix. The fix is to seed nothing here
-- and let the edge function / client ensure create the canonical row idempotently.
-- For local dev convenience we keep a single placeholder row for today; the edge function
-- will upsert the correct deterministic letters on first call via onConflict.
-- Clean up any legacy extra rows for today first (idempotent).
delete from public.daily_puzzles
where puzzle_date = current_date
  and board_type not in (16,20,21,25);

-- Single placeholder — will be replaced by the deterministic board on first daily-publish call.
-- We insert only ONE row (the caller’s placeholder board_type is arbitrary; upsert will correct it).
-- To avoid any confusion we insert no puzzle here by default. Uncomment to insert a dev placeholder:
-- insert into public.daily_puzzles (puzzle_date, board_type, board_letters)
-- values (current_date, 16, 'abcdefghijklmnop')
-- on conflict (puzzle_date, board_type) do nothing;
