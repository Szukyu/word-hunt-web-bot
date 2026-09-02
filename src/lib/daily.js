// Daily Board Helper
import { supabase } from './supabase'
import { FREQ } from '../data/freq'

// Simple seeded RNG (mulberry32) — deterministic, no external deps
export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DAILY_BOARD_TYPES = [16, 20, 21, 25]
export const DAILY_BOARD_META = {
  16: { name: '4×4 Grid', size: 16 },
  20: { name: 'Donut Ring', size: 20 },
  21: { name: 'X Shape', size: 21 },
  25: { name: '5×5 Grid', size: 25 },
}

// Hash a date string (+ optional boardType) into a 32-bit seed
export function dateToSeed(dateStr, boardType = '') {
  // dateStr: YYYY-MM-DD (UTC)
  let h = 2166136261
  const s = boardType === '' ? `${dateStr}` : `${dateStr}:${boardType}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Deterministically choose one of the 4 base board types
export function chooseDailyBoardType(dateStr) {
  const seed = dateToSeed(dateStr, 'choose')
  const rand = mulberry32(seed)
  const idx = Math.floor(rand() * DAILY_BOARD_TYPES.length)
  return DAILY_BOARD_TYPES[idx]
}

// Daily board creation: pick type + randomly populate (deterministic per date)
export function createDailyBoard(dateStr = todayUTC()) {
  const boardType = chooseDailyBoardType(dateStr)
  const boardLetters = generateSeededBoard(dateStr, boardType)
  return {
    puzzle_date: dateStr,
    board_type: boardType,
    board_letters: boardLetters,
    board_name: DAILY_BOARD_META[boardType].name,
  }
}

// Non-deterministic helper (for previews/testing): random board type + random letters
export function createRandomDailyBoard() {
  const boardType = DAILY_BOARD_TYPES[Math.floor(Math.random() * DAILY_BOARD_TYPES.length)]
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const cumulative = []
  let sum = 0
  for (const f of FREQ) {
    sum += f
    cumulative.push(sum)
  }
  const total = cumulative[cumulative.length - 1]
  let board = ''
  for (let i = 0; i < boardType; i++) {
    const r = Math.random() * total
    const idx = cumulative.findIndex((w) => r <= w)
    board += letters[idx]
  }
  return {
    board_type: boardType,
    board_letters: board,
    board_name: DAILY_BOARD_META[boardType].name,
  }
}

export function generateSeededBoard(dateStr, boardType) {
  const seed = dateToSeed(dateStr, boardType)
  const rand = mulberry32(seed)
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const cumulative = []
  let sum = 0
  for (const f of FREQ) {
    sum += f
    cumulative.push(sum)
  }
  const total = cumulative[cumulative.length - 1]
  let board = ''
  for (let i = 0; i < boardType; i++) {
    const r = rand() * total
    const idx = cumulative.findIndex((w) => r <= w)
    board += letters[idx]
  }
  return board
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
}

export function daysUntilNextUTC() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0))
  return Math.max(0, next - now)
}

// --- Supabase wrappers ---

export async function fetchDailyPuzzle(dateStr, boardType) {
  const { data, error } = await supabase
    .from('daily_puzzles')
    .select('*')
    .eq('puzzle_date', dateStr)
    .eq('board_type', boardType)
    .maybeSingle()
  if (error) throw error
  if (data) return data
  // fallback: deterministic local generation if no DB row yet (e.g. preview)
  return {
    puzzle_date: dateStr,
    board_type: boardType,
    board_letters: generateSeededBoard(dateStr, boardType),
    _local: true,
  }
}

export async function fetchTodaysPuzzles() {
  const d = todayUTC()
  const { data, error } = await supabase.from('daily_puzzles').select('*').eq('puzzle_date', d)
  if (error) throw error
  return data
}

// Enforce one attempt per day per board_type
export async function submitDailyScore({ puzzleDate, boardType, score, wordsFound, totalPossibleScore, totalPossibleWords, longestWord }) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const payload = {
    user_id: user.id,
    puzzle_date: puzzleDate,
    board_type: boardType,
    score,
    words_found: wordsFound,
    words_count: wordsFound.length,
    total_possible_score: totalPossibleScore,
    total_possible_words: totalPossibleWords,
    percent_score: totalPossibleScore ? (score / totalPossibleScore) * 100 : null,
    longest_word: longestWord,
  }

  const { data, error } = await supabase
    .from('daily_scores')
    .insert(payload)
    .select()
    .single()

  // unique violation means already submitted
  if (error) {
    if (error.code === '23505') throw new Error('Already submitted today for this board')
    throw error
  }
  return data
}

export async function fetchDailyLeaderboard(puzzleDate, boardType, limit = 50) {
  const { data, error } = await supabase
    .from('daily_scores')
    .select('score, words_count, percent_score, created_at, profiles!inner(username)')
    .eq('puzzle_date', puzzleDate)
    .eq('board_type', boardType)
    .order('score', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function fetchUserDailyHistory(userId, limit = 30) {
  const { data, error } = await supabase
    .from('daily_scores')
    .select('*')
    .eq('user_id', userId)
    .order('puzzle_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// Daily archive: list puzzles with optional user completion flag
export async function fetchDailyArchive({ from, to, boardType } = {}) {
  let q = supabase.from('daily_puzzles').select('*').order('puzzle_date', { ascending: false })
  if (from) q = q.gte('puzzle_date', from)
  if (to) q = q.lte('puzzle_date', to)
  if (boardType) q = q.eq('board_type', boardType)
  const { data, error } = await q
  if (error) throw error
  return data
}

// One Attempt

const LOCAL_PREFIX = 'daily_attempt'

export function dailyAttemptKey(puzzleDate, boardType, userId) {
  const scope = userId ? `user:${userId}` : 'guest'
  return `${LOCAL_PREFIX}:${scope}:${puzzleDate}:${boardType}`
}

export function getLocalDailyAttempt(puzzleDate, boardType, userId) {
  if (typeof window === 'undefined' || !window.localStorage) return null
  const keysToTry = userId
    ? [dailyAttemptKey(puzzleDate, boardType, userId), dailyAttemptKey(puzzleDate, boardType, null), `${LOCAL_PREFIX}:${puzzleDate}:${boardType}`]
    : [dailyAttemptKey(puzzleDate, boardType, null), `${LOCAL_PREFIX}:${puzzleDate}:${boardType}`]
  for (const k of keysToTry) {
    try {
      const raw = window.localStorage.getItem(k)
      if (raw) return JSON.parse(raw)
    } catch (_e) {
      void _e
    }
  }
  return null
}

export function hasLocalDailyAttempt(puzzleDate, boardType, userId) {
  return !!getLocalDailyAttempt(puzzleDate, boardType, userId)
}

export function saveLocalDailyAttempt(attempt, userId) {
  if (typeof window === 'undefined' || !window.localStorage) return
  const { puzzle_date, board_type } = attempt
  if (!puzzle_date || !board_type) return
  const key = dailyAttemptKey(puzzle_date, board_type, userId)
  try {
    window.localStorage.setItem(key, JSON.stringify({ ...attempt, _saved_at: new Date().toISOString() }))
  } catch (_e) {
    void _e
  }
  // keep legacy generic guest key in sync for backwards compat when anonymous
  if (!userId) {
    try {
      window.localStorage.setItem(`${LOCAL_PREFIX}:${puzzle_date}:${board_type}`, JSON.stringify({ ...attempt, _saved_at: new Date().toISOString() }))
    } catch (_e) { void _e }
  }
}

export function clearLocalDailyAttempt(puzzleDate, boardType, userId) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(dailyAttemptKey(puzzleDate, boardType, userId))
  } catch (_e) { void _e }
}

export async function fetchDailyAttempt(puzzleDate, boardType) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data, error } = await supabase
    .from('daily_scores')
    .select('*')
    .eq('user_id', user.id)
    .eq('puzzle_date', puzzleDate)
    .eq('board_type', boardType)
    .maybeSingle()
  if (error) throw error
  return data
}

// Extra check: Supabase + Local Fallback
export async function getDailyAttempt(puzzleDate, boardType, userId) {
  const local = getLocalDailyAttempt(puzzleDate, boardType, userId)
  // if we have a userId, try remote first
  if (userId) {
    try {
      const { data, error } = await supabase
        .from('daily_scores')
        .select('*')
        .eq('user_id', userId)
        .eq('puzzle_date', puzzleDate)
        .eq('board_type', boardType)
        .maybeSingle()
      if (error) throw error
      if (data) {
        // normalize shape for local cache (so Daily.jsx can read uniformly)
        const normalized = {
          puzzle_date: data.puzzle_date,
          board_type: data.board_type,
          score: data.score,
          words_count: data.words_count,
          words_found: data.words_found,
          total_possible_score: data.total_possible_score,
          total_possible_words: data.total_possible_words,
          percent_score: data.percent_score,
          longest_word: data.longest_word,
          created_at: data.created_at,
          _remote: true,
        }
        saveLocalDailyAttempt(normalized, userId)
        return normalized
      }
    } catch (_e) {
      void _e
    }
    return local
  }
  // anonymous: local only
  // also try to fetch via auth user if userId not passed but session exists
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) return getDailyAttempt(puzzleDate, boardType, user.id)
  } catch (_e) { void _e }
  return local
}

export async function hasDailyAttempt(puzzleDate, boardType, userId) {
  const attempt = await getDailyAttempt(puzzleDate, boardType, userId)
  return !!attempt
}

// --- Daily history & calendar helpers (view-only, no replay) ---

export function getAllLocalDailyAttempts(userId = null) {
  if (typeof window === 'undefined' || !window.localStorage) return []
  const out = []
  const seen = new Set()
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i)
    if (!key || !key.startsWith(LOCAL_PREFIX)) continue
    // Filter by scope: when userId is known, only include that user's keys;
    // when guest (null), include guest + legacy keys.
    if (userId) {
      if (!key.includes(`user:${userId}`)) continue
    } else {
      // guest: include guest or legacy (no user: prefix)
      if (key.includes('user:')) continue
    }
    try {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      const data = JSON.parse(raw)
      if (!data.puzzle_date || !data.board_type) continue
      const dedupKey = `${data.puzzle_date}:${data.board_type}`
      if (seen.has(dedupKey)) continue
      seen.add(dedupKey)
      out.push(data)
    } catch (_e) { void _e }
  }
  // Also scan legacy keys for guest explicitly (already covered but ensure dedup)
  if (!userId) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (!key || !key.startsWith(`${LOCAL_PREFIX}:`)) continue
      if (key.includes('user:') || key.includes(':guest:')) continue
      // legacy: daily_attempt:YYYY-MM-DD:boardType
      const parts = key.split(':')
      if (parts.length !== 3) continue
      const dedupKey = `${parts[1]}:${parts[2]}`
      if (seen.has(dedupKey)) continue
      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) continue
        const data = JSON.parse(raw)
        if (!data.puzzle_date || !data.board_type) continue
        seen.add(dedupKey)
        out.push(data)
      } catch (_e) { void _e }
    }
  }
  out.sort((a, b) => (b.puzzle_date || '').localeCompare(a.puzzle_date || ''))
  return out
}

// number of distinct local keys collected (for debugging)
export function countLocalDailyAttempts(userId = null) {
  return getAllLocalDailyAttempts(userId).length
}

// Build a Map puzzle_date -> attempt (deduped, latest _saved_at wins if duplicates across scopes)
export function buildLocalHistoryMap(userId = null) {
  const list = getAllLocalDailyAttempts(userId)
  const map = new Map()
  for (const a of list) {
    const k = a.puzzle_date
    if (!map.has(k)) map.set(k, a)
    else {
      const existing = map.get(k)
      const tA = a._saved_at || a.created_at || ''
      const tB = existing._saved_at || existing.created_at || ''
      if (tA > tB) map.set(k, a)
    }
  }
  return map
}

// Merge remote history (from Supabase) + local fallback, dedup by puzzle_date:board_type
export function mergeDailyHistory(remoteList = [], localList = []) {
  const map = new Map()
  for (const r of remoteList) {
    const k = `${r.puzzle_date}:${r.board_type}`
    map.set(k, { ...r, _source: 'remote' })
  }
  for (const l of localList) {
    const k = `${l.puzzle_date}:${l.board_type}`
    if (!map.has(k)) map.set(k, { ...l, _source: 'local' })
  }
  const merged = Array.from(map.values())
  merged.sort((a, b) => (b.puzzle_date || '').localeCompare(a.puzzle_date || ''))
  return merged
}

// Helper: enumerate whether a dateStr is in the future relative to todayUTC
export function isFutureDate(dateStr) {
  return dateStr > todayUTC()
}
