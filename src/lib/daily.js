/**
 * Daily puzzle helpers
 * - Deterministic seeded board generation (same for all users per day, per board_type)
 * - Supabase fetch/persist for daily_puzzles + daily_scores + streaks
 */
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

// Hash a date string + boardType into a 32-bit seed
export function dateToSeed(dateStr, boardType) {
  // dateStr: YYYY-MM-DD (UTC)
  let h = 2166136261
  const s = `${dateStr}:${boardType}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
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
