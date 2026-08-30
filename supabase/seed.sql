-- Seed: system themes + example daily puzzle for today
-- Run with: supabase db reset  or  supabase seed

-- System themes (is_system = true, is_public = true)
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

-- Example daily puzzle for today (UTC) - 4x4 deterministic seed
-- In production, supabase/functions/daily-publish will generate this daily at 00:00 UTC
insert into public.daily_puzzles (puzzle_date, board_type, board_letters, solution_word_count, total_possible_score)
values
  (current_date, 16, 'abcdefghijklmnop', 42, 8400),
  (current_date, 25, 'abcdefghijklmnopqrstuvwxy', 85, 15200),
  (current_date, 20, 'abcdefghijklmnopqrst', 38, 7200),
  (current_date, 21, 'abcdefghijklmnopqrstu', 45, 9100)
on conflict (puzzle_date, board_type) do nothing;
