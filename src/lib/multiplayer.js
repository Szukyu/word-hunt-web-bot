// Multiplayer Library - Supabase Realtime Integration
import { supabase } from './supabase'
import { getCurrentUserId } from './supabase'

// ----- Types -----
// Match status: 'waiting' | 'ready' | 'countdown' | 'playing' | 'finished' | 'cancelled' | 'abandoned'
// Match mode: 'casual' | 'ranked' | 'friend' | 'custom'

// ----- Match Creation & Joining -----

/** Create a new match (creator becomes player slot 0) */
export async function createMatch({
  boardType,
  boardLetters,
  gameTime,
  mode = 'casual',
  isPublic = true,
}) {
  const { data, error } = await supabase.rpc('create_match', {
    p_board_type: boardType,
    p_board_letters: boardLetters,
    p_game_time: gameTime,
    p_mode: mode,
    p_is_public: isPublic,
  })
  if (error) throw error
  return data // match_id (uuid)
}

/** Join a match by ID or invite code */
export async function joinMatch({ matchId, inviteCode }) {
  const { data, error } = await supabase.rpc('join_match', {
    p_match_id: matchId,
    p_invite_code: inviteCode,
  })
  if (error) throw error
  return data // match_id (uuid)
}

/** Set ready state in lobby */
export async function setMatchReady(matchId, ready) {
  const { error } = await supabase.rpc('set_match_ready', {
    p_match_id: matchId,
    p_ready: ready,
  })
  if (error) throw error
}

/** Start the match (after countdown) */
export async function startMatch(matchId) {
  const { error } = await supabase.rpc('start_match', { p_match_id: matchId })
  if (error) throw error
}

/** Submit a word during play (server validates + updates live score) */
export async function submitMatchWord(matchId, word, pos) {
  const { data, error } = await supabase.rpc('submit_match_word', {
    p_match_id: matchId,
    p_word: word,
    p_pos: pos,
  })
  if (error) throw error
  return data // { ok, score, word, error? }
}

/** Finish the match (timer ended or both finished) */
export async function finishMatch(matchId) {
  const { data, error } = await supabase.rpc('finish_match', { p_match_id: matchId })
  if (error) throw error
  return data // match summary with winner, players, scores
}

/** Abandon match (player leaves) */
export async function abandonMatch(matchId) {
  const { error } = await supabase.rpc('abandon_match', { p_match_id: matchId })
  if (error) throw error
}

// ----- Fetching -----

/** Fetch full match state (for lobby / replay) */
export async function fetchMatch(matchId) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      *,
      match_players (
        id, user_id, slot, is_ready, connected_at, disconnected_at,
        score, words_found, words_list, live_score, live_words_count,
        profiles:user_id (username, display_name, avatar_url)
      )
    `)
    .eq('id', matchId)
    .single()
  if (error) throw error
  return data
}

/** Fetch match with words for post-game comparison */
export async function fetchMatchWithWords(matchId) {
  const match = await fetchMatch(matchId)
  const { data: words, error } = await supabase
    .from('match_words')
    .select('*')
    .eq('match_id', matchId)
    .order('found_at', { ascending: true })
  if (error) throw error
  return { ...match, words: words || [] }
}

/** Fetch active match for current user (if any) */
export async function fetchMyActiveMatch() {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const { data, error } = await supabase
    .from('match_players')
    .select('match_id, matches!inner(*)')
    .eq('user_id', userId)
    .in('matches.status', ['waiting', 'ready', 'countdown', 'playing'])
    .maybeSingle()
  if (error) throw error
  return data?.matches ?? null
}

/** Fetch recent finished matches for current user */
export async function fetchMyRecentMatches(limit = 10) {
  const userId = await getCurrentUserId()
  if (!userId) return []

  const { data, error } = await supabase
    .from('match_players')
    .select(`
      match_id, slot, score, words_found, words_list,
      matches!inner(id, board_type, board_letters, game_time, mode, status, created_at, started_at, finished_at, winner_id, invite_code)
    `)
    .eq('user_id', userId)
    .eq('matches.status', 'finished')
    .order('matches.finished_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// ----- Realtime Subscriptions -----

/**
 * Subscribe to match updates (status, players ready, live scores)
 * Returns unsubscribe function
 */
export function subscribeToMatch(matchId, callbacks) {
  const {
    onMatchUpdate,      // (match) => void - match row changed
    onPlayerUpdate,     // (player) => void - player row changed (ready, live_score, etc.)
    onPlayerJoin,       // (player) => void - new player joined
    onPlayerLeave,      // (playerId) => void - player left
    onStatusChange,     // (status) => void - match status changed
  } = callbacks

  const channel = supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${matchId}`,
      },
      (payload) => {
        if (payload.eventType === 'UPDATE' && onMatchUpdate) {
          onMatchUpdate(payload.new)
        }
        if (payload.eventType === 'UPDATE' && onStatusChange) {
          onStatusChange(payload.new.status)
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'match_players',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT' && onPlayerJoin) {
          onPlayerJoin(payload.new)
        } else if (payload.eventType === 'UPDATE' && onPlayerUpdate) {
          onPlayerUpdate(payload.new)
        } else if (payload.eventType === 'DELETE' && onPlayerLeave) {
          onPlayerLeave(payload.old.user_id)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to live word submissions for real-time ghost score
 * Returns unsubscribe function
 */
export function subscribeToMatchWords(matchId, onWordSubmitted) {
  const channel = supabase
    .channel(`match_words:${matchId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'match_words',
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        if (onWordSubmitted) onWordSubmitted(payload.new)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Subscribe to match invitations (friend invites via invite_code)
 * Returns unsubscribe function
 */
export async function subscribeToInvites(onInvite) {
  const userId = await getCurrentUserId()
  if (!userId) return () => {}

  const channel = supabase
    .channel(`invites:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `creator_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new.mode === 'friend' && payload.new.invite_code) {
          onInvite(payload.new)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// ----- Quick Play / Matchmaking -----

/** Find a quick play opponent (casual, random board) */
export async function findQuickMatch({ boardType = null, gameTime = 60 } = {}) {
  const userId = await getCurrentUserId()
  if (!userId) throw new Error('Not authenticated')

  // Look for waiting match with same preferences
  let query = supabase
    .from('matches')
    .select('id, board_type, board_letters, game_time, creator_id, invite_code')
    .eq('status', 'waiting')
    .eq('mode', 'casual')
    .neq('creator_id', userId)
    .is('invite_code', null) // not a friend invite
    .order('created_at', { ascending: true })
    .limit(1)

  if (boardType) query = query.eq('board_type', boardType)
  if (gameTime) query = query.eq('game_time', gameTime)

  const { data: existing, error } = await query.maybeSingle()
  if (error) throw error

  if (existing) {
    // Join existing match
    await joinMatch({ matchId: existing.id })
    return existing.id
  }

  // Create new match with random board
  const boardTypeFinal = boardType || [16, 20, 21, 25][Math.floor(Math.random() * 4)]
  const boardLetters = generateRandomBoard(boardTypeFinal)

  const matchId = await createMatch({
    boardType: boardTypeFinal,
    boardLetters,
    gameTime,
    mode: 'casual',
  })
  return matchId
}

/** Generate random board letters (client-side, mirrors server logic) */
function generateRandomBoard(boardType) {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const FREQ = [0.08167,0.01492,0.02782,0.04253,0.12702,0.02228,0.02015,0.06094,0.06966,0.00153,0.00772,0.04025,0.02406,0.06749,0.07507,0.01929,0.00095,0.05987,0.06327,0.09056,0.02758,0.00978,0.02360,0.00150,0.01974,0.00074]
  const cumulative = []
  let sum = 0
  for (const f of FREQ) { sum += f; cumulative.push(sum) }
  const total = cumulative[cumulative.length - 1]
  let board = ''
  for (let i = 0; i < boardType; i++) {
    const r = Math.random() * total
    const idx = cumulative.findIndex((w) => r <= w)
    board += letters[idx]
  }
  return board
}

// ----- Friend Invite Helpers -----

/** Create a friend invite match (returns invite code) */
export async function createFriendInvite({ boardType, gameTime = 90 }) {
  const boardLetters = generateRandomBoard(boardType)
  const matchId = await createMatch({
    boardType,
    boardLetters,
    gameTime,
    mode: 'friend',
    isPublic: false,
  })
  // Fetch the generated invite code
  const { data } = await supabase.from('matches').select('invite_code').eq('id', matchId).single()
  return { matchId, inviteCode: data?.invite_code }
}

/** Accept a friend invite by code */
export async function acceptFriendInvite(inviteCode) {
  return joinMatch({ inviteCode })
}

// ----- Ranked Matchmaking (placeholder for future) -----

/** Join ranked queue (placeholder) */
export async function joinRankedQueue({ boardType, gameTime = 60 } = {}) {
  // TODO: Implement ranked matchmaking with ELO
  // For now, fall back to casual
  return findQuickMatch({ boardType, gameTime })
}

// ----- Utility -----

export const MATCH_STATUS = {
  WAITING: 'waiting',
  READY: 'ready',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  FINISHED: 'finished',
  CANCELLED: 'cancelled',
  ABANDONED: 'abandoned',
}

export const MATCH_MODE = {
  CASUAL: 'casual',
  RANKED: 'ranked',
  FRIEND: 'friend',
  CUSTOM: 'custom',
}

export function getBoardLabel(boardType) {
  const labels = { 16: '4×4', 20: 'Donut', 21: 'X', 25: '5×5' }
  return labels[boardType] || String(boardType)
}

export function formatMatchTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
}