import { createClient } from '@supabase/supabase-js'

// Support both new publishable key name and legacy anon key name
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY // guard: mis-config still warns

const anonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn('[supabase] Missing VITE_SUPABASE_URL — check your .env')
}
if (!anonKey) {
  console.warn('[supabase] Missing VITE_SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_ANON_KEY — check your .env')
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  anonKey,
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
