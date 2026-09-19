import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const EDGE_VERSION = 2

// ---- seeded RNG + board gen (must stay in sync with src/lib/daily.js) ----
const FREQ = [0.08167,0.01492,0.02782,0.04253,0.12702,0.02228,0.02015,0.06094,0.06966,0.00153,0.00772,0.04025,0.02406,0.06749,0.07507,0.01929,0.00095,0.05987,0.06327,0.09056,0.02758,0.00978,0.02360,0.00150,0.01974,0.00074]
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function dateToSeed(dateStr: string, boardType: string | number) {
  let h = 2166136261
  const s = boardType === '' ? `${dateStr}` : `${dateStr}:${boardType}`
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
const DAILY_BOARD_TYPES = [16, 20, 21, 25] as const
function chooseDailyBoardType(dateStr: string) {
  const seed = dateToSeed(dateStr, 'choose')
  const rand = mulberry32(seed)
  const idx = Math.floor(rand() * DAILY_BOARD_TYPES.length)
  return DAILY_BOARD_TYPES[idx]
}
function generateSeededBoard(dateStr: string, boardType: number) {
  const seed = dateToSeed(dateStr, boardType)
  const rand = mulberry32(seed)
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  const cumulative: number[] = []
  let sum = 0
  for (const f of FREQ) { sum += f; cumulative.push(sum) }
  const total = cumulative[cumulative.length - 1]
  let board = ''
  for (let i = 0; i < boardType; i++) {
    const r = rand() * total
    const idx = cumulative.findIndex(w => r <= w)
    board += letters[idx]
  }
  return board
}
function createDailyBoard(dateStr: string) {
  const bt = chooseDailyBoardType(dateStr)
  return { puzzle_date: dateStr, board_type: bt, board_letters: generateSeededBoard(dateStr, bt) }
}

// ---- http helpers ----
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

// ---- date helpers ----
function isYmd(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}
function enumerateDates(fromStr: string, toStr: string): string[] {
  if (!isYmd(fromStr) || !isYmd(toStr)) return []
  const from = new Date(fromStr + 'T00:00:00Z')
  const to = new Date(toStr + 'T00:00:00Z')
  if (from > to) return []
  const dates: string[] = []
  for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}
function resolveBackfill(n: number): string[] {
  const clamped = Math.min(Math.max(n | 0, 1), 90)
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - (clamped - 1))
  return enumerateDates(start.toISOString().slice(0, 10), todayUtc())
}
function assertReasonableDate(s: string) {
  const d = new Date(s + 'T00:00:00Z')
  const maxFuture = new Date()
  maxFuture.setUTCFullYear(maxFuture.getUTCFullYear() + 1)
  if (d > maxFuture) throw new Error(`date ${s} is more than 1 year in the future; refusing`)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    if (!supabaseUrl || !serviceKey) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl, serviceKey)

    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date')
    const fromParam = url.searchParams.get('from')
    const toParam = url.searchParams.get('to')
    const backfillParam = url.searchParams.get('backfill')

    let dates: string[] = []

    if (fromParam) {
      const to = toParam || todayUtc()
      dates = enumerateDates(fromParam, to)
      if (dates.length === 0) throw new Error(`Invalid from/to: ${fromParam} -> ${to}`)
      if (dates.length > 90) throw new Error('backfill range too large (max 90 days)')
    } else if (backfillParam !== null) {
      dates = resolveBackfill(parseInt(backfillParam, 10) || 1)
    } else if (dateParam) {
      if (!isYmd(dateParam)) throw new Error('Invalid date format, expected YYYY-MM-DD')
      dates = [dateParam]
    } else if (req.method === 'POST') {
      let body: any = null
      try { body = await req.clone().json() } catch { /* not json */ }
      if (body?.from) {
        const to = body.to || todayUtc()
        dates = enumerateDates(body.from, to)
        if (dates.length === 0) throw new Error(`Invalid from/to: ${body.from} -> ${to}`)
        if (dates.length > 90) throw new Error('backfill range too large (max 90 days)')
      } else if (body?.backfill !== undefined && body?.backfill !== null && body?.backfill !== '') {
        dates = resolveBackfill(parseInt(String(body.backfill), 10) || 1)
      } else if (body?.date) {
        if (!isYmd(body.date)) throw new Error('Invalid date format, expected YYYY-MM-DD')
        dates = [body.date]
      }
    }

    if (dates.length === 0) dates = [todayUtc()]
    for (const d of dates) assertReasonableDate(d)

    const allRows = dates.map(createDailyBoard)

    const { error: delErr } = await supabase
      .from('daily_puzzles')
      .delete()
      .in('puzzle_date', dates)
    if (delErr) throw delErr

    const { data: inserted, error: insErr } = await supabase
      .from('daily_puzzles')
      .insert(allRows)
      .select()
    if (insErr) throw insErr

    const { data: canonical, error: fetchErr } = await supabase
      .from('daily_puzzles')
      .select('*')
      .in('puzzle_date', dates)
      .order('puzzle_date', { ascending: true })
    if (fetchErr) throw fetchErr

    return jsonResponse({
      ok: true,
      version: EDGE_VERSION,
      dates,
      count: allRows.length,
      inserted,
      canonical,
    })
  } catch (e) {
    return jsonResponse({ ok: false, version: EDGE_VERSION, error: String(e) }, 500)
  }
})
