import { createClient } from '@supabase/supabase-js'

// Support both new publishable key name and legacy anon key name.
// The publishable key (sb_publishable_...) is a valid anon replacement for Supabase JS v2.
const url = import.meta.env.VITE_SUPABASE_URL

const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY

if (!url) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL — check your .env (expected https://<ref>.supabase.co)')
}
if (!anonKey) {
  console.warn('[supabase] Missing VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY — check your .env')
}

export const supabase = createClient(url, anonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

// Helper: get current user id or null
export const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}
