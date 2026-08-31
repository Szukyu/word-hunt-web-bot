/**
 * Custom boards & shapes helpers
 */
import { supabase } from './supabase'

export async function saveCustomBoard({ name, boardType, letters, wordCount, maxScore, longestWords, isPublic = false }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('custom_boards')
    .insert({
      user_id: user.id,
      name,
      board_type: boardType,
      letters: letters.toLowerCase(),
      word_count: wordCount,
      max_score: maxScore,
      longest_words: longestWords,
      is_public: isPublic,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchMyCustomBoards() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('custom_boards').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchPublicBoards(limit = 50) {
  const { data, error } = await supabase.from('custom_boards').select('*, profiles!inner(username)').eq('is_public', true).order('upvotes', { ascending: false }).limit(limit)
  if (error) throw error
  return data
}

export async function deleteCustomBoard(id) {
  const { error } = await supabase.from('custom_boards').delete().eq('id', id)
  if (error) throw error
}

// --- Shapes ---

export async function saveCustomShape({ name, width, height, activeTiles, adjacencyMap, isPublic = false }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const tileCount = activeTiles.length
  const { data, error } = await supabase
    .from('custom_shapes')
    .insert({
      user_id: user.id,
      name,
      width,
      height,
      active_tiles: activeTiles,
      tile_count: tileCount,
      adjacency_map: adjacencyMap,
      is_public: isPublic,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchMyCustomShapes() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from('custom_shapes').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchPublicShapes(limit = 50) {
  const { data, error } = await supabase.from('custom_shapes').select('*, profiles!inner(username)').eq('is_public', true).order('upvotes', { ascending: false }).limit(limit)
  if (error) throw error
  return data
}

// Share helpers: encode board to URL-safe base64
export function encodeBoardToURL(letters) {
  return btoa(letters).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}
export function decodeBoardFromURL(encoded) {
  const b64 = encoded.replaceAll('-', '+').replaceAll('_', '/')
  return atob(b64)
}
