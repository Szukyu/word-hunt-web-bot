-- Allow users to delete their own daily_scores (for test cleanup and pre-fix sync retry)
drop policy if exists "daily_scores_delete_own" on public.daily_scores;
create policy "daily_scores_delete_own" on public.daily_scores for delete using (auth.uid() = user_id);

-- Also ensure daily_puzzles can be read by anon (already true via select_all) but keep

-- Grant delete to authenticated (already via RLS)
