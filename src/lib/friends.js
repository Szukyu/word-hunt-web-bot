import { supabase } from './supabase'

function normalizeUsername(u) {
  return String(u ?? '').trim().toLowerCase()
}

// --- core helpers ---
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user || null
}

async function fetchProfilesByIds(ids) {
  if (!ids.length) return new Map()
  const { data, error } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids)
  if (error) throw error
  return new Map((data || []).map(p => [p.id, p]))
}

// --- send / accept / decline / cancel / remove ---
export async function sendFriendRequest(friendId) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  if (friendId === user.id) throw new Error("Can't add yourself")

  // pre-check both directions to give friendly error before RLS unique violation
  const { data: existing } = await supabase.from('friendships')
    .select('id, user_id, friend_id, status')
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
    .maybeSingle()
  if (existing) {
    if (existing.status === 'accepted') throw new Error('Already friends')
    if (existing.status === 'pending') throw new Error(existing.user_id === user.id ? 'Invite already sent' : 'They already invited you — check Requests')
    if (existing.status === 'blocked') throw new Error('User is blocked')
  }

  const { data, error } = await supabase.from('friendships').insert({ user_id: user.id, friend_id: friendId, status: 'pending' }).select().single()
  if (error) throw error
  return data
}

export async function sendFriendRequestByUsername(username) {
  const norm = normalizeUsername(username)
  if (!norm) throw new Error('Enter a username')
  if (norm.length < 3 || norm.length > 20) throw new Error('Username 3–20 chars')
  if (!/^[a-z0-9_]+$/.test(norm)) throw new Error('Only letters, numbers, _')
  const profile = await lookupUserByUsername(norm)
  if (!profile) throw new Error('User not found')
  return sendFriendRequest(profile.id)
}

export async function acceptFriendRequest(id) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  // only recipient can accept
  const { data, error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id).eq('friend_id', user.id).eq('status', 'pending').select().single()
  if (error) throw error
  if (!data) throw new Error('Request not found')
  return data
}

export async function declineFriendRequest(id) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('friendships').delete().eq('id', id).eq('friend_id', user.id).eq('status', 'pending')
  if (error) throw error
  return true
}

export async function cancelOutgoingRequest(id) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('friendships').delete().eq('id', id).eq('user_id', user.id).eq('status', 'pending')
  if (error) throw error
  return true
}

export async function removeFriend(friendshipId) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('friendships').delete().eq('id', friendshipId).or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
  if (error) throw error
  return true
}

export async function removeFriendByUserId(otherId) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  const { error } = await supabase.from('friendships').delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${otherId}),and(user_id.eq.${otherId},friend_id.eq.${user.id})`)
    .eq('status', 'accepted')
  if (error) throw error
  return true
}

// --- fetchers ---
export async function fetchFriends() {
  const user = await getCurrentUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted')
  if (error) throw error
  return data || []
}

export async function fetchFriendsDetailed() {
  const user = await getCurrentUser()
  if (!user) return []
  const rows = await fetchFriends()
  if (!rows.length) return []
  const otherIds = [...new Set(rows.map(r => r.user_id === user.id ? r.friend_id : r.user_id))]
  const map = await fetchProfilesByIds(otherIds)
  return rows.map(r => {
    const otherId = r.user_id === user.id ? r.friend_id : r.user_id
    const p = map.get(otherId) || { id: otherId, username: 'unknown', display_name: null, avatar_url: null }
    return { ...r, otherId, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, profile: p }
  })
}

export async function fetchFriendIds() {
  const friends = await fetchFriends()
  if (!friends.length) return []
  const user = await getCurrentUser()
  if (!user) return []
  const ids = new Set()
  for (const f of friends) {
    const other = f.user_id === user.id ? f.friend_id : f.user_id
    if (other) ids.add(other)
  }
  return Array.from(ids)
}

export async function fetchFriendIdsWithSelf() {
  const user = await getCurrentUser()
  if (!user) return []
  const friendIds = await fetchFriendIds()
  return [user.id, ...friendIds]
}

export async function fetchPendingRequests() {
  const user = await getCurrentUser()
  if (!user) return []
  const { data, error } = await supabase.from('friendships').select('id, user_id, friend_id, status, created_at').eq('friend_id', user.id).eq('status', 'pending')
  if (error) throw error
  return data || []
}

export async function fetchIncomingDetailed() {
  const user = await getCurrentUser()
  if (!user) return []
  const { data, error } = await supabase.from('friendships').select('id, user_id, friend_id, status, created_at').eq('friend_id', user.id).eq('status', 'pending').order('created_at', { ascending: false })
  if (error) throw error
  const rows = data || []
  if (!rows.length) return []
  const requesterIds = [...new Set(rows.map(r => r.user_id))]
  const map = await fetchProfilesByIds(requesterIds)
  return rows.map(r => {
    const p = map.get(r.user_id) || { username: 'unknown' }
    return { ...r, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, profile: p }
  })
}

export async function fetchOutgoingDetailed() {
  const user = await getCurrentUser()
  if (!user) return []
  const { data, error } = await supabase.from('friendships').select('id, user_id, friend_id, status, created_at').eq('user_id', user.id).eq('status', 'pending').order('created_at', { ascending: false })
  if (error) throw error
  const rows = data || []
  if (!rows.length) return []
  const targetIds = [...new Set(rows.map(r => r.friend_id))]
  const map = await fetchProfilesByIds(targetIds)
  return rows.map(r => {
    const p = map.get(r.friend_id) || { username: 'unknown' }
    return { ...r, username: p.username, display_name: p.display_name, avatar_url: p.avatar_url, profile: p }
  })
}

export async function lookupUserByUsername(username) {
  const { data, error } = await supabase.from('profiles').select('id, username, display_name, avatar_url').eq('username', normalizeUsername(username)).maybeSingle()
  if (error) throw error
  return data
}

export function buildInviteLink(username) {
  if (typeof window === 'undefined') return ''
  if (!username) return window.location.origin + '/'
  const u = normalizeUsername(username)
  return `${window.location.origin}?add=${encodeURIComponent(u)}`
}

