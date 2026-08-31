# TODO

> Last updated: 2026-08-29

---

## 1. Daily Puzzle

- [x] Daily board generation — deterministic seeded board (same for all users per day, per board type) — `src/lib/daily.js:10`
- [x] Daily puzzle UI — dedicated route/card on home (`/daily`), countdown to next puzzle (UTC midnight) — `src/components/Daily/Daily.jsx:1` + `src/App.jsx:1` + `src/components/Option/Option.jsx:1`
- [x] One attempt per day enforcement (per profile, local + Supabase sync)
- [ ] Daily streak tracking + freeze / streak repair logic
- [ ] Daily history & calendar view — past dailies replayable (but not counting toward streak)
- [ ] Daily share card — spoiler-free result image/text (`Word Hunt 29/08/2026 - 847 pts - 12/38 words`)
- [ ] Daily leaderboard (global + friends) for each day's board
- [ ] Daily archive and stats — average, best day, % of max score found
- [ ] Push / in-app notification nudge for daily (opt-in)

## 2. Stats for Each Profile

- [ ] Replace `src/components/Stats/Stats.jsx:1` WIP with real stats dashboard
- [ ] Persist stats per-profile in Supabase (users table / profiles table) vs. only localStorage
- [ ] Core stats: games played, total words found, total points, avg points/game, best game, avg words/game
- [ ] Per-board-type stats — breakdown for 4x4, 5x5, Donut, X (and future custom shapes)
- [ ] Word-length distribution & score distribution charts
- [ ] High-score / personal best per board size + time control
- [ ] History log — recent 20/50 games with score, board preview (`src/utils/boardPreview.js:1`), date
- [ ] Streaks, playtime, and longest word ever found
- [ ] Percentile vs. perfect — `% of allPossibleWords` / `% of totalPossibleScore` per game (`src/components/Play/Play.jsx:97`)
- [ ] Export / import stats (JSON/CSV)
- [ ] Privacy toggle — public vs. private stats for leaderboards

## 3. Multiplayer Competitive

- [ ] Real-time head-to-head (1v1) on same board, same timer — first design: WebSocket / Supabase Realtime
- [ ] Matchmaking — quick play, invite by link/code, vs. friend
- [ ] Lobby flow — waiting room, ready check, board reveal countdown (3-2-1)
- [ ] Live opponent progress (ghost score / word count) without spoiling words until end
- [ ] Post-game compare screen — overlapping vs. unique words, score breakdown
- [ ] Ranked / casual queues + ELO/MMR per board type
- [ ] Private lobbies with custom settings (board type, gameTime from `src/components/Option/Option.jsx:1`, custom boards)
- [ ] Spectator / replay mode — watch finished multiplayer games
- [ ] Anti-cheat basics — server-side word validation, timer authority
- [ ] Multiplayer rematch + chat/emotes (preset reactions)

## 4. More Default Themes

- [ ] Expand `src/themes/index.js:4` beyond `dark`/`light` — ship 8-12 curated defaults
- [ ] Proposed new defaults: `midnight`, `nord`, `dracula`, `solarized-dark`, `solarized-light`, `catppuccin-mocha`, `gruvbox`, `tokyo-night`, `oled-black`, `pastel`
- [ ] Theme preview grid polish in `src/components/ThemePage/ThemePage.jsx:1` (search/filter, sort by light/dark)
- [ ] Theme creator (`src/components/ThemeCreator/ThemeCreator.jsx:1`) — live board preview inside creator
- [ ] Import / export theme as JSON/shareable URL
- [ ] Community themes gallery (Supabase storage) — upvote, clone, report
- [ ] Per-profile default theme persistence

## 5. Board Builder — A: Letter Board Builder (Set Letters)

- [ ] New route/view `Board Builder — Letters` — editable grid where you type letters per tile
- [ ] Support all existing sizes: 4x4 (16), Donut (20), X (21), 5x5 (25) from `src/components/Play/Play.jsx:14`
- [ ] Randomize / clear / fill with frequency-weighted letters (`src/data/freq.js:1`)
- [ ] Validate board is solvable — live solver preview using `src/hooks/board.js:1` + `src/hooks/search.js:1`
- [ ] Show stats for custom letter board — word count, max score, longest words
- [ ] Save / load / duplicate custom letter boards (local + Supabase per user)
- [ ] Play custom letter board in Practice/Play mode
- [ ] Share custom letter board via URL (base64/encoded) and QR code

## 6. Board Builder — B: Shape Board Builder (Custom Shapes)

- [ ] New route/view `Board Builder — Shapes` — canvas/grid editor to paint active/inactive tiles
- [ ] Shape presets: 6x6, 3x3, cross, plus, frame, diamond, T-shape, L-shape, custom freeform
- [ ] Variable dimensions up to e.g. 8x8 with toggle tiles on/off
- [ ] Auto-generate `adjacencyMap` for arbitrary shapes (reuse/extend `src/hooks/board.js:1` + `src/utils/Board.jsx:1`)
- [ ] Add new board renderers or generalize `src/components/Boards/Board.jsx:1` to support arbitrary adjacency/masks + `InvisibleTile`
- [ ] InvisibleTile / empty tile handling polish (`src/components/InvisibleTile/InvisibleTile.jsx:1`)
- [ ] Shape validation — ensure connectivity, minimum 9 tiles, not fragmented
- [ ] Save / load / duplicate custom shapes (local + Supabase)
- [ ] Play custom shapes + daily/multiplayer support on custom shapes (opt-in)
- [ ] Share custom shape + letter combo via URL

---

## 7. Gameplay & Modes — New Ideas

- [ ] Zen / untimed practice mode (no timer, focus on 100% completion)
- [ ] Puzzle / challenge mode — find the 5 highest-scoring words, longest word, or pangram-style challenges
- [ ] Time controls — 30s, 60s, 90s, 120s, 180s via `src/hooks/timer.js:1` + custom input in Setup (`src/components/Setup/Setup.jsx:1`)
- [ ] Hints system — reveal a word, highlight first tile, or show word count by length
- [ ] Undo / backtrack polish + full path line drawn between selected tiles
- [ ] Scoring variants — classic vs. length-bonus vs. rarity-weighted
- [ ] Word definitions on tap/hover (dictionary API) for found & missed words
- [ ] End-game review — tap missed word to animate its path on board (`src/components/Results/Results.jsx:1`)

## 8. Social & Sharing

- [ ] Global leaderboards — all-time, daily, weekly, per board type
- [ ] Friends system — add via username/code, friend leaderboards
- [ ] Share board as image (canvas export using boardPreview) + copy link
- [ ] Results sharing — spoiler-safe card for socials
- [ ] Profile pages — public stats, favorite theme, recent games

## 9. Progression & Retention

- [ ] Achievements — first win, 100 words, 10k points, 7-day streak, 100% board, etc.
- [ ] Levels / XP — XP per word/score, level up animation
- [ ] Weekly challenges — e.g. “Find 50 6-letter words this week”
- [ ] Season / battle pass (lightweight) — cosmetic rewards (themes, tile skins)

## 10. UX / Accessibility / Polish

- [ ] Onboarding tutorial — first-run overlay explaining drag vs. click, adjacency, submit
- [ ] Keyboard map polish (`src/components/Keymap/Keymap.jsx:1`) + full keyboard-only play
- [ ] Mobile UX pass — larger hit areas, haptics on selection, prevent scroll while dragging (`src/components/Play/Play.jsx:250`)
- [ ] Animations & juice — tile pop, score float (`framer-motion`), confetti on PB
- [ ] Sound effects — tile select, submit success/error, tick at 10s, toggle + volume in settings
- [ ] Reduced motion / high contrast / colorblind modes
- [ ] Empty / error states — offline, no words found, invalid custom board messaging

## 11. Customization & Settings

- [ ] Tile skins — rounded, square, bubble, neon (theme-adjacent)
- [ ] Custom dictionary toggle — enable/disable controversial words, profanity filter
- [ ] Language packs — word lists beyond English (`src/data/words.js:1`)
- [ ] User setting: auto-submit on lift vs. manual submit button
- [ ] User setting: show live word length/score preview while dragging

## 12. PWA & Platform

- [ ] PWA support — installable, offline play, offline word list caching
- [ ] Push notifications — daily reminder, friend challenge, rematch invite (opt-in)
- [ ] Deep linking — `/play/:boardId`, `/daily/:date`, `/builder/:id`, `/user/:id`

## 13. Tech, Data & Quality

- [ ] Solver performance pass — trie/prefix pruning in `src/hooks/search.js:1`, debounce live highlighting
- [ ] Supabase schema — tables for `profiles`, `games`, `daily_scores`, `custom_boards`, `custom_shapes`, `themes`, `friendships`
- [ ] Auth polish (`src/components/Auth/Auth.jsx:1` + `src/context/AuthContext.jsx:1`) — OAuth (Google, GitHub), guest -> account upgrade
- [ ] Seed infrastructure for daily — server cron / edge function to publish board at 00:00 UTC
- [ ] Tests — unit for adjacency, scoring (`src/data/points.js:1`), solver, board generation; E2E for play flow (`/tst`)
- [ ] Analytics (privacy-friendly) — board popularity, avg completion %, drop-off
- [ ] ESLint/Prettier + CI — `npm run lint` in GitHub Actions, preview deploys on Cloudflare
- [ ] Error logging + perf monitoring

## 14. Content & Admin (Nice to Have)

- [ ] Admin panel — curate daily boards, feature community boards/themes, moderate
- [ ] Board rating — upvote/downvote custom boards, most-liked feed
- [ ] Word of the day — definition + example board highlighting it
