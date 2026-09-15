-- Fix: enforce exactly 1 puzzle per day (the “sometimes 4, sometimes 1” bug)
-- Root causes:
--   1) Early edge function inserted 4 rows per date (one per board_type 16,20,21,25).
--   2) Later fix changed it to 1 row per date via chooseDailyBoardType(date) but never cleaned legacy rows.
--   3) seed.sql also inserted 4 dummy rows for today, leaving that date with 4 while new dates had 1.
--   4) GitHub workflow sent mismatched body/QS causing ambiguous edge invocations.
--
-- This migration deduplicates legacy dates that have >1 puzzle, keeping the earliest row
-- per puzzle_date. The next invocation of the fixed edge function (daily-publish) will then
-- upsert the correct deterministic board (chooseDailyBoardType) and its cleanup step
-- will delete any remaining non-canonical row, converging to exactly 1 per day.

-- Keep earliest row per puzzle_date, delete the rest
delete from public.daily_puzzles
where id in (
  select id from (
    select id, puzzle_date, row_number() over (partition by puzzle_date order by created_at asc, board_type asc) as rn
    from public.daily_puzzles
  ) t where rn > 1
);

-- Optional: ensure RLS still allows the edge function (service_role bypasses RLS) and
-- that the table has the expected unique constraint (already: unique(puzzle_date, board_type)).
-- No schema change needed — the invariant is enforced by the edge function’s post-upsert cleanup.
