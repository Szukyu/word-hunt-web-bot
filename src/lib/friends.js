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
    .select('*, profiles!friendships_friend_id_fkey(username), friend:friend_id(username)')
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .eq('status', 'accepted')
  if (error) throw error
  return data
}

export async function fetchPendingRequests() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('friendships').select('*').eq('friend_id', user.id).eq('status', 'pending')
  if (error) throw error
  return data
}
