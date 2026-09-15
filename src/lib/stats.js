/**
 * Stats helpers — persist & query per-profile stats
 * Used to replace src/components/Stats/Stats.jsx WIP
 */
import { supabase } from './supabase'
import { POINTS } from '../data/points'

async function ensureProfileForGame(user) {
  if (!user?.id) return
  const { data: existing } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (existing) return
  const raw = user.user_metadata?.username || user.email?.split('@')[0] || 'user'
  let username = String(raw).toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20)
  if (username.length < 3) username = `user_${user.id.slice(0, 6)}`
  if (!/^[a-z0-9_]+$/.test(username)) username = `user_${user.id.slice(0, 8)}`
  const { error } = await supabase.from('profiles').upsert({ id: user.id, username }, { onConflict: 'id' })
  if (error?.code === '23505') {
    const alt = `${username.slice(0, 12)}_${user.id.slice(0, 4)}`.slice(0, 20)
    await supabase.from('profiles').upsert({ id: user.id, username: alt }, { onConflict: 'id' })
  }
}

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
  await ensureProfileForGame(user)

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

  // per time-control + board breakdown for high-score per board size + time
  const perBoardTime = {}
  for (const g of games) {
    const k = `${g.board_type}:${g.game_time}`
    if (!perBoardTime[k]) perBoardTime[k] = { board_type: g.board_type, game_time: g.game_time, games: 0, bestScore: 0 }
    perBoardTime[k].games++
    perBoardTime[k].bestScore = Math.max(perBoardTime[k].bestScore, g.score)
  }

  // merged word-length / score distribution (length 3..10) + score buckets
  const scoreDistribution = {}
  for (const g of games) {
    const d = g.score_distribution || {}
    for (const [len, cnt] of Object.entries(d)) {
      scoreDistribution[len] = (scoreDistribution[len] || 0) + cnt
    }
  }
  const scoreBuckets = {}
  for (const g of games) {
    const bucket = g.score >= 2000 ? '2000+' : g.score >= 1000 ? '1000-1999' : g.score >= 500 ? '500-999' : '0-499'
    scoreBuckets[bucket] = (scoreBuckets[bucket] || 0) + 1
  }

  const recentGames = [...games].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50)

  return {
    gamesPlayed: games.length,
    totalWords,
    totalPoints,
    avgPoints: totalPoints / games.length,
    avgWords: totalWords / games.length,
    bestGame,
    longestWord,
    perBoard,
    perBoardTime,
    scoreDistribution,
    scoreBuckets,
    recentGames: recentGames.slice(0, 20),
    allGames: games, // for import/export completeness
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

export function parseStatsImport(text) {
  const data = JSON.parse(text)
  // normalize: accept either full summary export or array of games
  if (Array.isArray(data)) return { games: data }
  if (data.allGames && Array.isArray(data.allGames)) return { games: data.allGames }
  if (data.recentGames && Array.isArray(data.recentGames)) return { games: data.recentGames }
  throw new Error('Unrecognized stats file — expected games array or summary export')
}

export async function importStatsGames(games) {
  // bulk insert — caller handles auth; we insert one-by-one to respect RLS
  const inserted = []
  for (const g of games) {
    // minimal validation
    if (!g.board_type || !g.board_letters) continue
    const row = {
      board_type: g.board_type,
      board_letters: g.board_letters,
      game_time: g.game_time || 90,
      score: g.score || 0,
      words_found: g.words_found || [],
      words_count: g.words_count || 0,
      total_possible_score: g.total_possible_score || 0,
      total_possible_words: g.total_possible_words || 0,
      percent_score: g.percent_score ?? null,
      percent_words: g.percent_words ?? null,
      longest_word: g.longest_word || null,
      longest_word_length: g.longest_word_length || null,
      score_distribution: g.score_distribution || {},
      is_daily: !!g.is_daily,
      puzzle_date: g.puzzle_date || null,
    }
    const { data, error } = await supabase.from('games').insert(row).select().single()
    if (!error && data) inserted.push(data)
  }
  return inserted
}

export function calcScoreForLength(len) {
  if (len < 3 || len > 10) return 0
  return POINTS[len - 3]
}

export function percentOfMax(score, total) {
  if (!total) return 0
  return (score / total) * 100
}
