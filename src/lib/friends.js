import { supabase } from './supabase'

export async function sendFriendRequest(friendId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase.from('friendships').insert({ user_id: user.id, friend_id: friendId, status: 'pending' }).select().single()
  if (error) throw error
  return data
}

export async function acceptFriendRequest(id) {
  const { data, error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function fetchFriends() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_id, friend_id, status, created_at')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted')
  if (error) throw error
  return data || []
}

export async function fetchFriendIds() {
  const friends = await fetchFriends()
  if (!friends.length) return []
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const ids = new Set()
  for (const f of friends) {
    const other = f.user_id === user.id ? f.friend_id : f.user_id
    if (other) ids.add(other)
  }
  return Array.from(ids)
}

export async function fetchFriendIdsWithSelf() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const friendIds = await fetchFriendIds()
  return [user.id, ...friendIds]
}

export async function fetchPendingRequests() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('friendships').select('*').eq('friend_id', user.id).eq('status', 'pending')
  if (error) throw error
  return data
}

export async function lookupUserByUsername(username) {
  const { data, error } = await supabase.from('profiles').select('id, username, display_name').eq('username', username.toLowerCase()).maybeSingle()
  if (error) throw error
  return data
}
