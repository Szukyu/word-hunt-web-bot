import { supabase } from './supabase'
import { fetchDailyLeaderboard, fetchFriendsDailyLeaderboard, todayUTC, createDailyBoard } from './daily'

export const BOARD_LABELS = {
  16: '4×4',
  20: 'Donut',
  21: 'X',
  25: '5×5',
}

function weekAgoISO() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

function mapGames(rows = []) {
  return rows.map((r, idx) => ({
    ...r,
    username: r.profiles?.username ?? r.profiles?.display_name ?? 'unknown',
    rank: idx + 1,
  }))
}

// Global: top games by score
export async function fetchGlobalLeaderboard({ boardType = null, period = 'all', limit = 50, friendIds = null } = {}) {
  if (period === 'daily') {
    const daily = createDailyBoard(todayUTC())
    if (friendIds) {
      return fetchFriendsDailyLeaderboard(daily.puzzle_date, daily.board_type, friendIds, limit)
    }
    return fetchDailyLeaderboard(daily.puzzle_date, daily.board_type, limit)
  }

  let q = supabase
    .from('games')
    .select('id, user_id, score, words_count, board_type, created_at, profiles(username, display_name)')
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit)

  if (boardType) q = q.eq('board_type', boardType)
  if (period === 'weekly') q = q.gte('created_at', weekAgoISO())
  if (friendIds && friendIds.length) q = q.in('user_id', friendIds)

  const { data, error } = await q
  if (error) throw error
  return mapGames(data)
}

export async function fetchMyGlobalRank({ boardType = null, period = 'all', myScore = null, friendIds = null } = {}) {
  let score = myScore
  if (score == null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    let q = supabase.from('games').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(1)
    if (boardType) q = q.eq('board_type', boardType)
    if (period === 'weekly') q = q.gte('created_at', weekAgoISO())
    const { data, error } = await q.maybeSingle()
    if (error) throw error
    if (!data) return null
    score = data.score
  }
  let q = supabase.from('games').select('id', { count: 'exact', head: true }).gt('score', score)
  if (boardType) q = q.eq('board_type', boardType)
  if (period === 'weekly') q = q.gte('created_at', weekAgoISO())
  if (friendIds && friendIds.length) q = q.in('user_id', friendIds)
  const { count, error } = await q
  if (error) throw error
  return (count ?? 0) + 1
}

export async function fetchMyBestGame({ boardType = null, period = 'all' } = {}) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  let q = supabase
    .from('games')
    .select('id, score, words_count, board_type, created_at')
    .eq('user_id', user.id)
    .order('score', { ascending: false })
    .limit(1)
  if (boardType) q = q.eq('board_type', boardType)
  if (period === 'weekly') q = q.gte('created_at', weekAgoISO())
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return data
}
