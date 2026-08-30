import { supabase } from './supabase'

export async function fetchSystemThemes() {
  const { data, error } = await supabase.from('themes').select('*').eq('is_system', true).order('name')
  if (error) throw error
  return data
}

export async function fetchPublicThemes(limit = 50) {
  const { data, error } = await supabase
    .from('themes')
    .select('*, profiles!inner(username)')
    .eq('is_public', true)
    .order('upvotes', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

export async function saveTheme({ slug, name, colors, isPublic = false }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('themes')
    .insert({
      user_id: user.id,
      slug,
      name,
      colors,
      is_public: isPublic,
      is_system: false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upvoteTheme(id) {
  const { data, error } = await supabase.rpc('increment_theme_upvote', { theme_id: id })
  if (error) {
    // fallback if RPC not deployed: client-side increment (racey but ok for now)
    const { data: cur } = await supabase.from('themes').select('upvotes').eq('id', id).single()
    const { data: upd, error: e2 } = await supabase.from('themes').update({ upvotes: (cur?.upvotes || 0) + 1 }).eq('id', id).select().single()
    if (e2) throw e2
    return upd
  }
  return data
}
