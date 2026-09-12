// UI-only friends store — localStorage mock, no Supabase.
// Kept tiny on purpose: just enough to demo the profile → friends flow.
const KEY = 'wh:friends_ui:v1'

function loadRaw() {
  try {
    const raw = window.localStorage?.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { friends: [], incoming: [], outgoing: [] }
}

function saveRaw(data) {
  try { window.localStorage?.setItem(KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function loadFriendsUi() {
  const d = loadRaw()
  return {
    friends: Array.isArray(d.friends) ? d.friends : [],
    incoming: Array.isArray(d.incoming) ? d.incoming : [],
    outgoing: Array.isArray(d.outgoing) ? d.outgoing : [],
  }
}

export function addOutgoing(username) {
  const data = loadRaw()
  const norm = username.trim().toLowerCase()
  if (!norm) return data
  // dedup across all lists
  const allUsernames = new Set([
    ...data.friends.map(f => f.username),
    ...data.incoming.map(f => f.username),
    ...data.outgoing.map(f => f.username),
  ])
  if (allUsernames.has(norm)) return data
  data.outgoing = [...data.outgoing, { id: `out_${Date.now()}_${norm}`, username: norm }]
  saveRaw(data)
  return data
}

export function cancelOutgoing(id) {
  const data = loadRaw()
  data.outgoing = data.outgoing.filter(f => f.id !== id)
  saveRaw(data)
  return data
}

export function acceptIncoming(id) {
  const data = loadRaw()
  const req = data.incoming.find(f => f.id === id)
  if (!req) return data
  data.incoming = data.incoming.filter(f => f.id !== id)
  data.friends = [...data.friends, { id: `fr_${Date.now()}_${req.username}`, username: req.username }]
  saveRaw(data)
  return data
}

export function declineIncoming(id) {
  const data = loadRaw()
  data.incoming = data.incoming.filter(f => f.id !== id)
  saveRaw(data)
  return data
}

export function removeFriend(id) {
  const data = loadRaw()
  data.friends = data.friends.filter(f => f.id !== id)
  saveRaw(data)
  return data
}

// demo helper: seed one incoming invite so empty state isn't blank forever
export function seedDemoIfEmpty() {
  const data = loadRaw()
  const total = data.friends.length + data.incoming.length + data.outgoing.length
  if (total !== 0) return data
  // leave empty — don't auto-seed; keep UI clean. Caller can opt-in.
  return data
}

export function buildInviteLink(username) {
  if (!username) return window.location.origin + '/'
  const u = String(username).trim().toLowerCase()
  // shareable deep-link — receiver can paste username into Add box
  return `${window.location.origin}?add=${encodeURIComponent(u)}`
}
