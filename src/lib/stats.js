/**
 * Stats helpers — persist & query per-profile stats
 * Used to replace src/components/Stats/Stats.jsx WIP
 */
import { supabase } from './supabase'
import { POINTS } from '../data/points'

// Persist a finished game to Supabase
export async function saveGame({
  boardType,
  boardLetters,
  gameTime,
  score,
  foundWords, // [{word, score, pos}]
  totalPossibleScore,
  totalPossibleWords,
  isDaily = false,
  puzzleDate = null,
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // Allow guest play: store locally only, caller should handle fallback
    return { localOnly: true }
  }

  const wordsCount = foundWords.length
  const percentScore = totalPossibleScore ? (score / totalPossibleScore) * 100 : null
  const percentWords = totalPossibleWords ? (wordsCount / totalPossibleWords) * 100 : null

  // longest word
  let longest = null
  let longestLen = 0
  for (const w of foundWords) {
    const l = w.word?.length ?? 0
    if (l > longestLen) {
      longestLen = l
      longest = w.word
    }
  }

  // score distribution by length 3..10
  const dist = {}
  for (const w of foundWords) {
    const len = w.word.length
    dist[len] = (dist[len] || 0) + 1
  }

  const row = {
    user_id: user.id,
    board_type: boardType,
    board_letters: boardLetters,
    game_time: gameTime,
    score,
    words_found: foundWords,
    words_count: wordsCount,
    total_possible_score: totalPossibleScore,
    total_possible_words: totalPossibleWords,
    percent_score: percentScore,
    percent_words: percentWords,
    longest_word: longest,
    longest_word_length: longestLen || null,
    score_distribution: dist,
    is_daily: isDaily,
    puzzle_date: puzzleDate,
  }

  const { data, error } = await supabase.from('games').insert(row).select().single()
  if (error) throw error
  return data
}

export async function fetchMyGames({ limit = 50, boardType = null, offset = 0 } = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  let q = supabase
    .from('games')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (boardType) q = q.eq('board_type', boardType)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function fetchStatsSummary(userId = null) {
  let uid = userId
  if (!uid) {
    const { data } = await supabase.auth.getUser()
    uid = data.user?.id
    if (!uid) return null
  }

  // aggregate client-side (could be a DB view / RPC for large data)
  const { data: games, error } = await supabase.from('games').select('*').eq('user_id', uid)
  if (error) throw error
  if (!games.length) {
    return {
      gamesPlayed: 0,
      totalWords: 0,
      totalPoints: 0,
      avgPoints: 0,
      avgWords: 0,
      bestGame: null,
      longestWord: null,
      perBoard: {},
      scoreDistribution: {},
      recentGames: [],
    }
  }

  const totalWords = games.reduce((s, g) => s + (g.words_count || 0), 0)
  const totalPoints = games.reduce((s, g) => s + (g.score || 0), 0)
  const bestGame = games.reduce((best, g) => (!best || g.score > best.score ? g : best), null)
  const longestWord = games.reduce((best, g) => {
    if (!g.longest_word) return best
    if (!best || g.longest_word.length > best.length) return g.longest_word
    return best
  }, null)

  // per board_type breakdown
  const perBoard = {}
  for (const g of games) {
    const k = String(g.board_type)
    if (!perBoard[k]) perBoard[k] = { games: 0, totalPoints: 0, totalWords: 0, bestScore: 0 }
    perBoard[k].games++
    perBoard[k].totalPoints += g.score
    perBoard[k].totalWords += g.words_count
    perBoard[k].bestScore = Math.max(perBoard[k].bestScore, g.score)
  }
  for (const k of Object.keys(perBoard)) {
    perBoard[k].avgPoints = perBoard[k].totalPoints / perBoard[k].games
    perBoard[k].avgWords = perBoard[k].totalWords / perBoard[k].games
  }

  // merged score distribution
  const scoreDistribution = {}
  for (const g of games) {
    const d = g.score_distribution || {}
    for (const [len, cnt] of Object.entries(d)) {
      scoreDistribution[len] = (scoreDistribution[len] || 0) + cnt
    }
  }

  const recentGames = [...games].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20)

  return {
    gamesPlayed: games.length,
    totalWords,
    totalPoints,
    avgPoints: totalPoints / games.length,
    avgWords: totalWords / games.length,
    bestGame,
    longestWord,
    perBoard,
    scoreDistribution,
    recentGames,
  }
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function updateProfilePrivacy(isPublic) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('profiles').update({ is_public: isPublic }).eq('id', user.id).select().single()
  if (error) throw error
  return data
}

export function exportStatsJSON(summary) {
  return JSON.stringify(summary, null, 2)
}

export function calcScoreForLength(len) {
  if (len < 3 || len > 10) return 0
  return POINTS[len - 3]
}

export function percentOfMax(score, total) {
  if (!total) return 0
  return (score / total) * 100
}
